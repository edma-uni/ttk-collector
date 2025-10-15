import {
  PipeTransform,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  // Add a logger for internal error reporting
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: z.ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Use Zod's built-in formatting for a structured error response
        throw new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: error.flatten().fieldErrors, // A structured and standard way
        });
      }

      // Log the unexpected error on the server for debugging
      this.logger.error(
        'An unexpected error occurred during validation',
        error,
      );
      throw new BadRequestException('Invalid payload');
    }
  }
}
