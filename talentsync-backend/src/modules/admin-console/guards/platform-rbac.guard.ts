import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class PlatformRbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');
    const allowed = ['SUPERADMIN', 'SUPPORT'];
    if (!allowed.includes(user.role))
      throw new ForbiddenException('Platform access required');
    return true;
  }
}
