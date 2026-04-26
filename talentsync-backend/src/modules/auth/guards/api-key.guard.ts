import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { verifyApiKey } from '../../settings/utils/api-key.util';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const header = req.headers['x-api-key'] as string | undefined;

    if (!header) return true; // allow pass-through - JWT may be used

    const keyRec = await this.prisma.aPIKey.findFirst({
      where: { active: true },
    });
    if (!keyRec) throw new UnauthorizedException();

    const valid = await verifyApiKey(header, keyRec.hashedKey);
    if (!valid) throw new UnauthorizedException();

    req.apiKey = {
      id: keyRec.id,
      scopes: keyRec.scopes,
      tenantId: keyRec.tenantId,
    };
    // Also set tenantId for context if missing?
    if (!req.tenantId && keyRec.tenantId) {
      req.tenantId = keyRec.tenantId;
    }

    return true;
  }
}
