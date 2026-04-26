import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyRefreshToken } from '../utils/token.util';

@Injectable()
export class RefreshAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const body = req.body;

    if (!body || !body.refreshToken)
      throw new UnauthorizedException('Missing refresh token');

    try {
      const payload = verifyRefreshToken(body.refreshToken);
      req.user = payload; // Attach user payload to request for controller to use
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
