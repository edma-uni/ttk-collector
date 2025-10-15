import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useFactory: () => {
            const prisma = new PrismaService(mockLogger as any);
            // Mock the connect methods to avoid actual database connection
            jest.spyOn(prisma, '$connect').mockResolvedValue();
            jest.spyOn(prisma, '$disconnect').mockResolvedValue();
            return prisma;
          },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have required methods', () => {
    expect(service.$connect).toBeDefined();
    expect(service.$disconnect).toBeDefined();
    expect(typeof service.$connect).toBe('function');
    expect(typeof service.$disconnect).toBe('function');
  });
});
