import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Resource not found exception
 * Use when a requested resource doesn't exist
 */
export class NotFoundException extends HttpException {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message,
        code: 'RESOURCE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
