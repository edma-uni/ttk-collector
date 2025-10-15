import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
  }

  async onModuleInit() {
    try {
      // Run Prisma migrations on startup
      this.logger.log('Running Prisma migrations...');
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy');

      if (stdout) {
        this.logger.log(`Migration output: ${stdout}`);
      }
      if (stderr) {
        this.logger.warn(`Migration warnings: ${stderr}`);
      }

      this.logger.log('Prisma migrations completed successfully');
    } catch (error) {
      this.logger.error(
        'Failed to run Prisma migrations',
        error instanceof Error ? error.message : 'Unknown error',
      );
      // Don't throw the error to allow the app to start even if migrations fail
      // This is useful in development when the database might not be ready yet
    }

    // Connect to the database
    await this.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }
}
