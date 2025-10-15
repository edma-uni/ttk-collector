import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @InjectPinoLogger(PrismaService.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async onModuleInit() {
    // Migrations are handled by entrypoint.sh
    // Connect to the database
    await this.$connect();
    this.logger.info('Connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.info('Disconnected from database');
  }
}
