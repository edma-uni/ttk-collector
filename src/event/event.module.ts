import { Module } from '@nestjs/common';
import { EventConsumerService } from './event.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsModule } from '../metrics/metrics.module';
import { NatsConsumerService } from '../nats/nats-consumer.service';

@Module({
  imports: [PrismaModule, MetricsModule],
  providers: [EventConsumerService, NatsConsumerService],
  exports: [NatsConsumerService],
})
export class EventModule {}
