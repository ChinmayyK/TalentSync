import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CandidatePortalService } from '../candidate-portal.service';

/**
 * Guard that validates candidate portal tokens passed via X-Portal-Token header.
 * Unlike JwtAuthGuard, this is specifically for candidate portal access.
 */
@Injectable()
export class PortalTokenGuard implements CanActivate {
  constructor(
    @Inject(forwardRef(() => CandidatePortalService))
    private readonly portalService: CandidatePortalService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-portal-token'];

    if (!token) {
      throw new UnauthorizedException('Missing portal access token');
    }

    try {
      const portalContext = await this.portalService.validateToken(token);

      // Attach portal context to request for use in controllers
      req.portalContext = portalContext;
      req.candidateId = portalContext.candidateId;
      req.tenantId = portalContext.tenantId;

      return true;
    } catch (error) {
      throw new UnauthorizedException(
        error.message || 'Invalid or expired portal token',
      );
    }
  }
}
