import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { NatsConsumerService } from '../src/nats/nats-consumer.service';

describe('FB Collector (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let natsService: NatsConsumerService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
        facebookEvent: {
          create: jest.fn(),
        },
      })
      .overrideProvider(NatsConsumerService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        isConnected: jest.fn().mockReturnValue(true),
        subscribe: jest.fn(),
        publish: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
    natsService = app.get<NatsConsumerService>(NatsConsumerService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Endpoints', () => {
    it('/health (GET) - should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('/live (GET) - should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/live')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ status: 'ok' });
        });
    });

    it('/ready (GET) - should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('checks');
          expect(res.body.checks).toHaveProperty('database');
          expect(res.body.checks).toHaveProperty('nats');
        });
    });

    it('/ready (GET) - should return degraded when services are down', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockRejectedValueOnce(new Error('DB down'));
      jest.spyOn(natsService, 'isConnected').mockReturnValueOnce(false);

      return request(app.getHttpServer())
        .get('/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('degraded');
          expect(res.body.checks.database).toBe('down');
          expect(res.body.checks.nats).toBe('down');
        });
    });
  });

  describe('Metrics Endpoint', () => {
    it('/metrics (GET) - should return Prometheus metrics', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .expect('Content-Type', /text\/plain/)
        .expect((res) => {
          expect(res.text).toContain('collector_');
          expect(res.text).toContain('app="fb-collector"');
        });
    });
  });
});
