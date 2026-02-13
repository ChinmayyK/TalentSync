import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../common/prisma.service';
import { InvitationService } from '../invitation.service';
import { PasswordResetService } from '../password-reset.service';
import { EmailService } from '../../email/email.service';
import { BruteForceService } from '../../../common/brute-force.guard';
import { PasswordPolicyService } from '../../../common/password-policy.service';
import * as bcrypt from 'bcrypt';

// Mock dependencies
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  tenant: {
    create: jest.fn().mockResolvedValue({
      id: 'tenant-1',
      name: 'Company',
      brandingLogoUrl: null,
    }),
  },
  userTenant: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Initialize $transaction separately to avoid circular reference
mockPrismaService.$transaction.mockImplementation((callback) =>
  callback(mockPrismaService),
);

jest.mock('bcrypt');
jest.mock('../utils/token.util', () => ({
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
}));

import * as TokenUtil from '../utils/token.util';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: InvitationService,
          useValue: {
            getInviteByToken: jest.fn(),
            verifyToken: jest.fn(),
            markInviteUsed: jest.fn(),
            createInvite: jest.fn(),
            listPendingInvites: jest.fn(),
            cancelInvite: jest.fn(),
          },
        },
        {
          provide: PasswordResetService,
          useValue: {
            initiateReset: jest.fn(),
            validateToken: jest.fn(),
            executeReset: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: BruteForceService,
          useValue: {
            isLocked: jest.fn().mockResolvedValue({ locked: false, ttl: 0 }),
            recordFailedAttempt: jest
              .fn()
              .mockResolvedValue({ locked: false, attempts: 1 }),
            clearFailedAttempts: jest.fn(),
          },
        },
        {
          provide: PasswordPolicyService,
          useValue: {
            enforcePolicy: jest.fn(),
            validatePassword: jest
              .fn()
              .mockResolvedValue({ isValid: true, feedback: [] }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      };
      const hashedPassword = 'hashedPassword';
      const user = {
        id: '1',
        ...dto,
        password: hashedPassword,
        role: 'RECRUITER',
        userTenants: [],
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword as never);
      mockPrismaService.user.create.mockResolvedValue(user);
      (TokenUtil.signAccessToken as jest.Mock).mockReturnValue('access_token');
      (TokenUtil.signRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token',
      );

      const result = await service.register(dto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(
        dto.password,
        expect.any(Number),
      );
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: '1',
        email: dto.email,
        name: dto.name,
      });
    });

    it('should throw ConflictException if email exists', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: dto.email,
      });

      await expect(service.register(dto)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login and return tokens for valid credentials', async () => {
      const dto = { email: 'test@example.com', password: 'password' };
      const user = {
        id: '1',
        email: dto.email,
        password: 'hashedPassword',
        name: 'Test User',
        role: 'RECRUITER',
        userTenants: [
          {
            role: 'RECRUITER',
            tenant: {
              id: 'tenant-1',
              name: 'Test Tenant',
              brandingLogoUrl: null,
            },
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
      (TokenUtil.signAccessToken as jest.Mock).mockReturnValue('access_token');
      (TokenUtil.signRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token',
      );

      const result = await service.login(dto.email, dto.password);

      expect(bcrypt.compare).toHaveBeenCalledWith(dto.password, user.password);
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const dto = { email: 'test@example.com', password: 'password' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto.email, dto.password)).rejects.toThrow();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const dto = { email: 'test@example.com', password: 'password' };
      const user = {
        id: '1',
        email: dto.email,
        password: 'hashed(Password',
        role: 'RECRUITER',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);

      await expect(service.login(dto.email, dto.password)).rejects.toThrow();
    });
  });
});

