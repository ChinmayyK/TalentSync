import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Business rule violation exception
 * Use when a business rule is violated (e.g., cannot delete candidate with scheduled interviews)
 */
export class BusinessException extends HttpException {
  constructor(message: string, code?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Business Rule Violation',
        message,
        code: code || 'BUSINESS_ERROR',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
