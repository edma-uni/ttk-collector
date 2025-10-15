import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { NatsConsumerService } from './nats/nats-consumer.service';

describe('AppController', () => {
  let controller: AppController;
  let prismaService: PrismaService;
  let natsService: NatsConsumerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: NatsConsumerService,
          useValue: {
            isConnected: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    prismaService = module.get<PrismaService>(PrismaService);
    natsService = module.get<NatsConsumerService>(NatsConsumerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return ok status', async () => {
      const result = await controller.getHealth();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getLiveness', () => {
    it('should return ok status', () => {
      const result = controller.getLiveness();

      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('getReadiness', () => {
    it('should return ok when both DB and NATS are up', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([{ 1: 1 }]);
      jest.spyOn(natsService, 'isConnected').mockReturnValue(true);

      const result = await controller.getReadiness();

      expect(result.status).toBe('ok');
      expect(result.checks.database).toBe('up');
      expect(result.checks.nats).toBe('up');
    });

    it('should return degraded when DB is down', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockRejectedValue(new Error('DB error'));
      jest.spyOn(natsService, 'isConnected').mockReturnValue(true);

      const result = await controller.getReadiness();

      expect(result.status).toBe('degraded');
      expect(result.checks.database).toBe('down');
      expect(result.checks.nats).toBe('up');
    });

    it('should return degraded when NATS is down', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([{ 1: 1 }]);
      jest.spyOn(natsService, 'isConnected').mockReturnValue(false);

      const result = await controller.getReadiness();

      expect(result.status).toBe('degraded');
      expect(result.checks.database).toBe('up');
      expect(result.checks.nats).toBe('down');
    });

    it('should return degraded when both are down', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockRejectedValue(new Error('DB error'));
      jest.spyOn(natsService, 'isConnected').mockReturnValue(false);

      const result = await controller.getReadiness();

      expect(result.status).toBe('degraded');
      expect(result.checks.database).toBe('down');
      expect(result.checks.nats).toBe('down');
    });
  });
});
