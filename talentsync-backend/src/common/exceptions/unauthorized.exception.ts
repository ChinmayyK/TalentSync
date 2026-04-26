import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Unauthorized access exception
 * Use when user lacks proper authentication or authorization
 */
export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Unauthorized access', code?: string) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: 'Unauthorized',
        message,
        code: code || 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
