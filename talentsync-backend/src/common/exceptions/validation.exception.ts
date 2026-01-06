import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Validation exception with field-level errors
 * Use when input validation fails
 */
export class ValidationException extends HttpException {
  constructor(errors: Record<string, string[]>) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'Validation Failed',
        message: 'Input validation failed',
        errors,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

