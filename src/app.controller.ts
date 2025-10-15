import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { NatsConsumerService } from './nats/nats-consumer.service';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly natsConsumer: NatsConsumerService,
  ) {}

  @Get('health')
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness(): Promise<{
    status: string;
    checks: { database: string; nats: string };
  }> {
    const checks = {
      database: 'down',
      nats: 'down',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'up';
    } catch (error) {
      // Database is down
    }

    if (this.natsConsumer.isConnected()) {
      checks.nats = 'up';
    }

    const status =
      checks.database === 'up' && checks.nats === 'up' ? 'ok' : 'degraded';

    return { status, checks };
  }

  @Get('live')
  getLiveness(): { status: string } {
    return { status: 'ok' };
  }
}
