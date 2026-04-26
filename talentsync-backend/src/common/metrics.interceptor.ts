import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PlatformMetricsService } from '../modules/system-metrics/services/platform-metrics.service';

/**
 * Global interceptor to track API request metrics
 * Records request latency, error rates, and active users/tenants
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  constructor(private metricsService: PlatformMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Extract tenant and user IDs from request - prefer authenticated user over header
    const tenantId = request.user?.tenantId || request.headers['x-tenant-id'];
    const userId = request.user?.id;

    return next.handle().pipe(
      tap(() => {
        const latency = Date.now() - startTime;
        this.metricsService
          .recordRequest(latency, false, tenantId, userId)
          .catch((err) =>
            this.logger.warn('Failed to record metrics:', err.message),
          );
      }),
      catchError((error) => {
        const latency = Date.now() - startTime;
        this.metricsService
          .recordRequest(latency, true, tenantId, userId)
          .catch((err) =>
            this.logger.warn('Failed to record metrics:', err.message),
          );
        throw error;
      }),
    );
  }
}
