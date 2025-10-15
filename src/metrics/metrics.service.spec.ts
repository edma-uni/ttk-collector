import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { register } from 'prom-client';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    // Clear all metrics before each test
    register.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    register.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('incrementEventsReceived', () => {
    it('should increment events received counter', async () => {
      service.incrementEventsReceived('raw.events.facebook.top.ad.view');
      service.incrementEventsReceived('raw.events.facebook.top.ad.view');

      const metrics = await register.metrics();
      expect(metrics).toContain('collector_events_received_total');
      expect(metrics).toContain('subject="raw.events.facebook.top.ad.view"');
    });
  });

  describe('incrementEventsProcessed', () => {
    it('should increment events processed counter', async () => {
      service.incrementEventsProcessed('facebook', 'ad.view', 'top');
      service.incrementEventsProcessed('facebook', 'ad.view', 'top');

      const metrics = await register.metrics();
      expect(metrics).toContain('collector_events_processed_total');
      expect(metrics).toContain('source="facebook"');
      expect(metrics).toContain('event_type="ad.view"');
      expect(metrics).toContain('funnel_stage="top"');
    });
  });

  describe('incrementEventsFailed', () => {
    it('should increment events failed counter', async () => {
      service.incrementEventsFailed('facebook', 'validation_error');
      service.incrementEventsFailed('facebook', 'processing_error');

      const metrics = await register.metrics();
      expect(metrics).toContain('collector_events_failed_total');
      expect(metrics).toContain('source="facebook"');
      expect(metrics).toContain('reason="validation_error"');
      expect(metrics).toContain('reason="processing_error"');
    });
  });

  describe('recordEventProcessingDuration', () => {
    it('should record event processing duration', async () => {
      service.recordEventProcessingDuration('facebook', 'ad.view', 0.123);
      service.recordEventProcessingDuration('facebook', 'ad.view', 0.456);

      const metrics = await register.metrics();
      expect(metrics).toContain('collector_event_processing_duration_seconds');
      expect(metrics).toContain('source="facebook"');
      expect(metrics).toContain('event_type="ad.view"');
    });
  });

  describe('setNatsConnectionStatus', () => {
    it('should set NATS connection status to connected', async () => {
      service.setNatsConnectionStatus(true);

      const metrics = await register.metrics();
      expect(metrics).toContain('collector_nats_connection_status');
      expect(metrics).toContain('collector_nats_connection_status 1');
    });

    it('should set NATS connection status to disconnected', async () => {
      service.setNatsConnectionStatus(false);

      const metrics = await register.metrics();
      expect(metrics).toContain('collector_nats_connection_status');
      expect(metrics).toContain('collector_nats_connection_status 0');
    });
  });

  describe('getRegistry', () => {
    it('should return prometheus registry', () => {
      const registry = service.getRegistry();
      expect(registry).toBe(register);
    });
  });
});
