import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Correlation ID Middleware
 *
 * Assigns a unique correlation ID to each request for tracing across services.
 * Uses existing ID from header if present (for cross-service tracing).
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    // Get or generate correlation ID
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) ||
      (req.headers[REQUEST_ID_HEADER] as string) ||
      randomUUID();

    // Attach to request for use in handlers
    req.correlationId = correlationId;

    // Add to response headers for client tracking
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    res.setHeader(REQUEST_ID_HEADER, correlationId);

    // Log request details with correlation ID (structured logging)
    const startTime = Date.now();

    // Log request
    this.logRequest(req, correlationId);

    // Log response on finish
    res.on('finish', () => {
      this.logResponse(req, res, correlationId, startTime);
    });

    next();
  }

  private logRequest(req: Request, correlationId: string): void {
    const logData = {
      type: 'request',
      correlationId,
      method: req.method,
      path: req.originalUrl,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.headers['x-forwarded-for'],
      userId: (req as any).user?.sub,
      tenantId: (req as any).tenantId,
    };

    // Skip logging for health checks
    if (req.originalUrl.includes('/health')) {
      return;
    }

    this.logger.log(JSON.stringify(logData));
  }

  private logResponse(
    req: Request,
    res: Response,
    correlationId: string,
    startTime: number,
  ): void {
    const duration = Date.now() - startTime;

    const logData = {
      type: 'response',
      correlationId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      userId: (req as any).user?.sub,
    };

    // Skip logging for health checks
    if (req.originalUrl.includes('/health')) {
      return;
    }

    // Use different log levels based on status
    if (res.statusCode >= 500) {
      this.logger.error(JSON.stringify(logData));
    } else if (res.statusCode >= 400) {
      this.logger.warn(JSON.stringify(logData));
    } else {
      this.logger.log(JSON.stringify(logData));
    }
  }
}

/**
 * Get correlation ID from request
 * Utility function for use in services
 */
export function getCorrelationId(req: Request): string {
  return req.correlationId || 'unknown';
}
