import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService {
  // Event processing metrics
  private readonly eventsReceivedTotal: Counter;
  private readonly eventsProcessedTotal: Counter;
  private readonly eventsFailedTotal: Counter;
  private readonly eventProcessingDuration: Histogram;

  // NATS connection metrics
  private readonly natsConnectionStatus: Gauge;

  constructor() {
    // Total number of events received from NATS
    this.eventsReceivedTotal = new Counter({
      name: 'collector_events_received_total',
      help: 'Total number of events received from NATS',
      labelNames: ['subject'],
      registers: [register],
    });

    // Total number of events successfully processed and saved to DB
    this.eventsProcessedTotal = new Counter({
      name: 'collector_events_processed_total',
      help: 'Total number of events successfully processed and saved',
      labelNames: ['source', 'event_type', 'funnel_stage'],
      registers: [register],
    });

    // Total number of events that failed validation or processing
    this.eventsFailedTotal = new Counter({
      name: 'collector_events_failed_total',
      help: 'Total number of events that failed processing',
      labelNames: ['source', 'reason'],
      registers: [register],
    });

    // Duration of event processing in seconds
    this.eventProcessingDuration = new Histogram({
      name: 'collector_event_processing_duration_seconds',
      help: 'Duration of event processing in seconds',
      labelNames: ['source', 'event_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [register],
    });

    // NATS connection status (1 = connected, 0 = disconnected)
    this.natsConnectionStatus = new Gauge({
      name: 'collector_nats_connection_status',
      help: 'NATS connection status (1 = connected, 0 = disconnected)',
      registers: [register],
    });
  }

  incrementEventsReceived(subject: string): void {
    this.eventsReceivedTotal.inc({ subject });
  }

  incrementEventsProcessed(
    source: string,
    eventType: string,
    funnelStage: string,
  ): void {
    this.eventsProcessedTotal.inc({
      source,
      event_type: eventType,
      funnel_stage: funnelStage,
    });
  }

  incrementEventsFailed(source: string, reason: string): void {
    this.eventsFailedTotal.inc({ source, reason });
  }

  recordEventProcessingDuration(
    source: string,
    eventType: string,
    durationSeconds: number,
  ): void {
    this.eventProcessingDuration.observe(
      { source, event_type: eventType },
      durationSeconds,
    );
  }

  setNatsConnectionStatus(connected: boolean): void {
    this.natsConnectionStatus.set(connected ? 1 : 0);
  }

  getRegistry() {
    return register;
  }
}
