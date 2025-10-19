import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import {
  connect,
  NatsConnection,
  JetStreamClient,
  JSONCodec,
  JsMsg,
  ConsumerConfig,
  AckPolicy,
  DeliverPolicy,
  JetStreamManager,
  StreamConfig,
  RetentionPolicy,
  DiscardPolicy,
  StorageType,
} from 'nats';
import { MetricsService } from '../metrics/metrics.service';

export interface MessageHandler {
  (data: unknown, msg: JsMsg): Promise<void>;
}

@Injectable()
export class NatsConsumerService implements OnModuleInit, OnModuleDestroy {
  private nc: NatsConnection;
  private js: JetStreamClient;
  private jsm: JetStreamManager;
  private readonly jsonCodec = JSONCodec();

  constructor(
    @InjectPinoLogger(NatsConsumerService.name)
    private readonly logger: PinoLogger,
    private readonly metricsService: MetricsService,
  ) {}

  async onModuleInit() {
    await this.connect();
    await this.ensureStreams();
  }

  private async connect() {
    try {
      this.nc = await connect({
        servers: process.env.NATS_URL || 'nats://localhost:4222',
        name: `collector-${process.env.HOSTNAME || 'local'}`,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 1000,
        timeout: 10000,
        pingInterval: 20000,
        maxPingOut: 3,
      });

      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();

      this.logger.info(`Connected to NATS server ${this.nc.getServer()}`);

      this.metricsService.setNatsConnectionStatus(true);

      void (async () => {
        for await (const status of this.nc.status()) {
          this.logger.info(
            `NATS connection status: ${status.type} - ${status.data}`,
          );

          const statusType = status.type.toString();
          if (statusType === 'disconnect' || statusType === 'error') {
            this.metricsService.setNatsConnectionStatus(false);
          } else if (statusType === 'reconnect') {
            this.metricsService.setNatsConnectionStatus(true);
          }
        }
      })();
    } catch (error) {
      this.logger.error('Error connecting to NATS server', error);
      this.metricsService.setNatsConnectionStatus(false);
      throw error;
    }
  }

  private async ensureStreams() {
    const streams: Partial<StreamConfig>[] = [
      {
        name: 'EVENTS',
        subjects: ['events.*'],
        retention: RetentionPolicy.Limits,
        max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days in nanoseconds
        max_msgs: 1_000_000,
        max_bytes: 1024 * 1024 * 1024, // 1GB
        discard: DiscardPolicy.Old,
        storage: StorageType.File, // Persistent storage
        num_replicas: 1, // Use 3 for production NATS cluster
        duplicate_window: 2 * 60 * 1_000_000_000, // 2 minutes deduplication
      },
    ];

    for (const streamConfig of streams) {
      try {
        await this.jsm.streams.info(streamConfig.name!);
        this.logger.info(`Stream ${streamConfig.name} already exists`);
      } catch (error) {
        if (error.code === '404') {
          await this.jsm.streams.add(streamConfig);
          this.logger.info(`Stream ${streamConfig.name} created`);
        } else {
          throw error;
        }
      }
    }
  }

  async subscribe(
    subject: string,
    handler: MessageHandler,
    consumerName?: string,
  ): Promise<void> {
    // Wait for JetStream to be initialized (with timeout)
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    while (!this.js && Date.now() - startTime < maxWaitTime) {
      this.logger.info('Waiting for JetStream to initialize...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!this.js) {
      throw new Error('JetStream is not initialized');
    }

    try {
      const consumerConfig: Partial<ConsumerConfig> = {
        durable_name:
          consumerName || `collector-${subject.replace(/[.>]/g, '-')}`,
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.All,
        ack_wait: 30_000_000_000, // 30 seconds in nanoseconds
        max_deliver: 5, // Retry up to 5 times
        filter_subject: subject,
      };

      // Create or get existing consumer
      const durableName = consumerConfig.durable_name!;
      let consumer;
      try {
        await this.jsm.consumers.info('EVENTS', durableName);
        this.logger.info(`Consumer ${durableName} already exists`);
        consumer = await this.js.consumers.get('EVENTS', durableName);
      } catch (error: any) {
        if (error.code === '404') {
          await this.jsm.consumers.add('EVENTS', consumerConfig);
          this.logger.info(`Consumer ${durableName} created`);
          consumer = await this.js.consumers.get('EVENTS', durableName);
        } else {
          throw error;
        }
      }

      this.logger.info(
        `Subscribed to subject: ${subject} with consumer: ${consumerConfig.durable_name}`,
      );

      const messages = await consumer.consume();

      void (async () => {
        for await (const msg of messages) {
          try {
            this.metricsService.incrementEventsReceived(msg.subject);

            const data = this.jsonCodec.decode(msg.data);

            await handler(data, msg);
          } catch (error) {
            this.logger.error(
              {
                err: error,
                subject: msg.subject,
              },
              `Error processing message from ${msg.subject}`,
            );
          }
        }
      })();
    } catch (error) {
      this.logger.error(`Failed to subscribe to subject ${subject}`, error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.nc) {
      await this.nc.drain();
      this.logger.info('NATS connection drained and closed');
    }
  }

  isConnected(): boolean {
    return this.nc && !this.nc.isClosed();
  }

  getConnection(): NatsConnection {
    return this.nc;
  }
}
