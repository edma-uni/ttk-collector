import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly eventsReceivedTotal: Counter;
  private readonly eventsProcessedTotal: Counter;
  private readonly eventsFailedTotal: Counter;
  private readonly eventProcessingDuration: Histogram;

  private readonly natsConnectionStatus: Gauge;

  constructor() {
    this.eventsReceivedTotal = new Counter({
      name: 'collector_events_received_total',
      help: 'Total number of events received from NATS',
      labelNames: ['subject'],
      registers: [register],
    });

    this.eventsProcessedTotal = new Counter({
      name: 'collector_events_processed_total',
      help: 'Total number of events successfully processed and saved',
      labelNames: ['source'],
      registers: [register],
    });
    this.eventsFailedTotal = new Counter({
      name: 'collector_events_failed_total',
      help: 'Total number of events that failed processing',
      labelNames: ['source', 'reason'],
      registers: [register],
    });

    this.eventProcessingDuration = new Histogram({
      name: 'collector_event_processing_duration_seconds',
      help: 'Duration of event processing in seconds',
      labelNames: ['source'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [register],
    });

    this.natsConnectionStatus = new Gauge({
      name: 'collector_nats_connection_status',
      help: 'NATS connection status (1 = connected, 0 = disconnected)',
      registers: [register],
    });
  }

  incrementEventsReceived(subject: string): void {
    this.eventsReceivedTotal.inc({ subject });
  }

  incrementEventsProcessed(source: string): void {
    this.eventsProcessedTotal.inc({
      source,
    });
  }

  incrementEventsFailed(source: string, reason: string): void {
    this.eventsFailedTotal.inc({ source, reason });
  }

  recordEventProcessingDuration(source: string, durationSeconds: number): void {
    this.eventProcessingDuration.observe({ source }, durationSeconds);
  }

  setNatsConnectionStatus(connected: boolean): void {
    this.natsConnectionStatus.set(connected ? 1 : 0);
  }

  getRegistry() {
    return register;
  }
}
