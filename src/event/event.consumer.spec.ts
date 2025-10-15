import { Test, TestingModule } from '@nestjs/testing';
import { EventConsumerService } from './event.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { NatsConsumerService } from '../nats/nats-consumer.service';
import { PinoLogger } from 'nestjs-pino';
import { ZodError } from 'zod';
import { JsMsg } from 'nats';

describe('EventConsumerService', () => {
  let service: EventConsumerService;
  let prismaService: PrismaService;
  let metricsService: MetricsService;
  let natsConsumerService: NatsConsumerService;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    assign: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      tiktokEvent: {
        create: jest.fn(),
      },
    };

    const mockMetricsService = {
      incrementEventsReceived: jest.fn(),
      incrementEventsProcessed: jest.fn(),
      incrementEventsFailed: jest.fn(),
      recordEventProcessingDuration: jest.fn(),
    };

    const mockNatsService = {
      subscribe: jest.fn(),
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EventConsumerService,
          useFactory: () => {
            return new EventConsumerService(
              mockLogger as any,
              mockNatsService as any,
              mockPrismaService as any,
              mockMetricsService as any,
            );
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: NatsConsumerService,
          useValue: mockNatsService,
        },
      ],
    }).compile();

    service = module.get<EventConsumerService>(EventConsumerService);
    prismaService = module.get<PrismaService>(PrismaService);
    metricsService = module.get<MetricsService>(MetricsService);
    natsConsumerService = module.get<NatsConsumerService>(NatsConsumerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleTiktokEvent', () => {
    const validEvent = {
      eventId: 'evt_456',
      timestamp: '2025-10-15T12:00:00Z',
      source: 'tiktok',
      funnelStage: 'top',
      eventType: 'video.view', // Use a valid TiktokTopEventType
      data: {
        user: {
          // Correct TiktokUser structure
          userId: 'user_tiktok_123',
          username: 'jane.doe',
          followers: 1500,
        },
        engagement: {
          // Correct TiktokEngagementTop structure
          watchTime: 45,
          percentageWatched: 75,
          device: 'iOS',
          country: 'CA',
          videoId: 'vid_789',
        },
      },
    };

    let mockMsg: any;

    beforeEach(() => {
      mockMsg = {
        subject: 'raw.events.tiktok.top.video.view',
        ack: jest.fn(),
        nak: jest.fn(),
      } as unknown as JsMsg;
      jest.clearAllMocks();
    });

    it('should process valid event successfully', async () => {
      const createSpy = jest
        .spyOn(prismaService.tiktokEvent, 'create')
        .mockResolvedValue({} as any);
      const publishSpy = jest
        .spyOn(natsConsumerService, 'publish')
        .mockResolvedValue();

      await (service as any).handleTiktokEvent(validEvent, mockMsg);

      expect(createSpy).toHaveBeenCalledWith({
        data: {
          eventId: validEvent.eventId,
          timestamp: new Date(validEvent.timestamp),
          funnelStage: validEvent.funnelStage,
          eventType: validEvent.eventType,
          data: validEvent.data,
        },
      });

      // FIX #1: Update the expected NATS subject
      expect(publishSpy).toHaveBeenCalledWith(
        'processed.events.tiktok.top.video.view', // <-- Was 'ad.view'
        validEvent,
      );

      expect(mockMsg.ack).toHaveBeenCalled();

      // FIX #2: Update the expected eventType for metrics
      expect(metricsService.incrementEventsProcessed).toHaveBeenCalledWith(
        'tiktok',
        'video.view', // <-- Was 'ad.view'
        'top',
      );
    });

    it('should handle validation errors', async () => {
      const invalidEvent = {
        eventId: 'evt_123',
        // missing required fields
      };

      await (service as any).handleTiktokEvent(invalidEvent, mockMsg);

      expect(mockMsg.ack).toHaveBeenCalled(); // Should ack invalid messages
      expect(metricsService.incrementEventsFailed).toHaveBeenCalledWith(
        'tiktok',
        'validation_error',
      );
    });

    it('should handle processing errors', async () => {
      jest
        .spyOn(prismaService.tiktokEvent, 'create')
        .mockRejectedValue(new Error('Database error'));

      await (service as any).handleTiktokEvent(validEvent, mockMsg);

      expect(mockMsg.ack).not.toHaveBeenCalled(); // Should NOT ack on processing errors
      expect(metricsService.incrementEventsFailed).toHaveBeenCalledWith(
        'tiktok',
        'processing_error',
      );
    });
  });
});
