import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './prisma.service';

// Trusted proxies - only trust x-forwarded-for from these
const TRUSTED_PROXIES = (process.env.TRUSTED_PROXIES || '127.0.0.1,::1')
  .split(',')
  .map((p) => p.trim());

// Decorator to require IP allowlist check
export const RequireIPAllowlist = () => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(
      'security:ipAllowlist',
      true,
      descriptor?.value || target,
    );
    return descriptor || target;
  };
};

// Decorator to skip IP allowlist check
export const SkipIPAllowlist = () => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(
      'security:skipIpAllowlist',
      true,
      descriptor?.value || target,
    );
    return descriptor || target;
  };
};

/**
 * Example TenantSecurityPolicy JSON format:
 * {
 *   "ipAllowlist": {
 *     "enabled": true,
 *     "allowedIPs": ["192.168.1.0/24", "10.0.0.1", "203.0.113.50"],
 *     "allowedRanges": [
 *       { "start": "192.168.1.1", "end": "192.168.1.255" }
 *     ]
 *   },
 *   "passwordPolicy": {
 *     "minLength": 8,
 *     "requireUppercase": true,
 *     "requireLowercase": true,
 *     "requireNumber": true,
 *     "requireSymbol": true,
 *     "maxAge": 90
 *   },
 *   "sessionPolicy": {
 *     "maxConcurrentSessions": 5,
 *     "sessionTimeout": 3600
 *   }
 * }
 */

@Injectable()
export class IPAllowlistGuard implements CanActivate {
  private readonly logger = new Logger(IPAllowlistGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();

    // Check if explicitly skipped
    const skipCheck = this.reflector.get<boolean>(
      'security:skipIpAllowlist',
      handler,
    );
    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    // No tenant context = skip check (public routes)
    if (!tenantId) {
      return true;
    }

    try {
      // Get tenant security policy
      const policy = await this.prisma.tenantSecurityPolicy.findUnique({
        where: { tenantId },
      });

      // No policy or IP allowlist not enabled = allow
      if (!policy || !policy.ipAllowlistEnabled) {
        return true;
      }

      const clientIP = this.getClientIP(request);
      const allowedIPs: string[] = policy.allowedIPs || [];

      // Check if IP is in allowed list
      if (this.isIPAllowed(clientIP, allowedIPs)) {
        return true;
      }

      // IP not allowed
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Access denied. Your IP address is not in the allowlist.',
          code: 'IP_NOT_ALLOWED',
          ip: clientIP,
        },
        HttpStatus.FORBIDDEN,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // If policy table doesn't exist yet or other DB error, allow request
      this.logger.error('IP allowlist check error:', error.message);
      return true;
    }
  }

  private getClientIP(request: any): string {
    const connectionIP = request.ip || request.connection?.remoteAddress || '';
    const normalizedConnectionIP = connectionIP.replace(/^::ffff:/, '');

    // Only trust x-forwarded-for if request comes from trusted proxy
    if (TRUSTED_PROXIES.includes(normalizedConnectionIP)) {
      const forwarded = request.headers['x-forwarded-for'];
      if (forwarded) {
        return forwarded.split(',')[0].trim();
      }
    }
    return normalizedConnectionIP || 'unknown';
  }

  private isIPAllowed(clientIP: string, allowedIPs: string[]): boolean {
    // Normalize client IP (remove ::ffff: prefix for IPv4)
    const normalizedClientIP = clientIP.replace(/^::ffff:/, '');

    for (const allowed of allowedIPs) {
      const normalizedAllowed = allowed.replace(/^::ffff:/, '');

      // Check for CIDR notation
      if (allowed.includes('/')) {
        if (this.isIPInCIDR(normalizedClientIP, normalizedAllowed)) {
          return true;
        }
      } else {
        // Exact match
        if (normalizedClientIP === normalizedAllowed) {
          return true;
        }
      }
    }

    return false;
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);

    const ipLong = this.ipToLong(ip);
    const rangeLong = this.ipToLong(range);
    const maskLong = ~((1 << (32 - mask)) - 1);

    return (ipLong & maskLong) === (rangeLong & maskLong);
  }

  private ipToLong(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) return 0;
    return parts.reduce(
      (acc, part, i) => acc + parseInt(part, 10) * Math.pow(256, 3 - i),
      0,
    );
  }
}

@Injectable()
export class IPAllowlistService {
  constructor(private prisma: PrismaService) {}

  async getPolicy(tenantId: string) {
    return this.prisma.tenantSecurityPolicy.findUnique({
      where: { tenantId },
    });
  }

  async updateIPAllowlist(
    tenantId: string,
    allowedIPs: string[],
    enabled: boolean,
  ) {
    return this.prisma.tenantSecurityPolicy.upsert({
      where: { tenantId },
      update: {
        allowedIPs,
        ipAllowlistEnabled: enabled,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        allowedIPs,
        ipAllowlistEnabled: enabled,
      },
    });
  }

  async addIP(tenantId: string, ip: string) {
    const policy = await this.getPolicy(tenantId);
    const currentIPs: string[] = (policy?.allowedIPs as string[]) || [];

    if (!currentIPs.includes(ip)) {
      currentIPs.push(ip);
      return this.updateIPAllowlist(
        tenantId,
        currentIPs,
        policy?.ipAllowlistEnabled ?? false,
      );
    }
    return policy;
  }

  async removeIP(tenantId: string, ip: string) {
    const policy = await this.getPolicy(tenantId);
    const currentIPs: string[] = (policy?.allowedIPs as string[]) || [];
    const filtered = currentIPs.filter((i) => i !== ip);
    return this.updateIPAllowlist(
      tenantId,
      filtered,
      policy?.ipAllowlistEnabled ?? false,
    );
  }

  async toggleIPAllowlist(tenantId: string, enabled: boolean) {
    const policy = await this.getPolicy(tenantId);
    return this.updateIPAllowlist(
      tenantId,
      (policy?.allowedIPs as string[]) || [],
      enabled,
    );
  }
}
