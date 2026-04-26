import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = this.buildErrorResponse(exception, request, status);

    // Log error with context
    this.logError(exception, request, status);

    response.status(status).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
    status: number,
  ) {
    const baseResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Handle HttpException (includes our custom exceptions)
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        return {
          ...baseResponse,
          ...exceptionResponse,
        };
      }

      return {
        ...baseResponse,
        error: exception.name,
        message: exceptionResponse,
      };
    }

    // Handle unknown errors
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    return {
      ...baseResponse,
      error: 'Internal Server Error',
      message,
      code: 'INTERNAL_ERROR',
      // Include stack trace only in development
      ...(process.env.NODE_ENV === 'development' &&
        exception instanceof Error && {
          stack: exception.stack,
        }),
    };
  }

  private logError(exception: unknown, request: Request, status: number) {
    const { method, url, body, query, params, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const ip = headers['x-forwarded-for'] || request.ip;

    const errorContext = {
      statusCode: status,
      method,
      url,
      ip,
      userAgent,
      body: this.sanitizeBody(body),
      query,
      params,
    };

    if (exception instanceof Error) {
      this.logger.error(
        `${method} ${url} - ${exception.message}`,
        exception.stack,
        JSON.stringify(errorContext, null, 2),
      );
    } else {
      this.logger.error(
        `${method} ${url} - Unknown error`,
        JSON.stringify(errorContext, null, 2),
      );
    }
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'accessToken',
    ];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}
