import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../email.service';
import { PrismaService } from '../../../common/prisma.service';
import { renderTemplate } from '../utils/template.util';

const mockPrisma = {
  tenant: {
    findUnique: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('renderTemplate', () => {
    it('renders onboarding template correctly', () => {
      const { subject, body } = renderTemplate('onboarding', {
        name: 'Alice',
        tenantName: 'Acme',
        setupLink: 'http://test',
      });
      expect(subject).toContain('Welcome to TalentSync — Acme');
      expect(body).toContain('Hi Alice');
      expect(body).toContain('http://test');
    });

    it('throws if template not found', () => {
      expect(() => renderTemplate('nonexistent', {})).toThrow();
    });
  });

  describe('sendMail', () => {
    // Mock nodemailer
    it('should try to send email via global smtp if tenant not provided', async () => {
      // We can't easily mock private queue or nodemailer transport here without DI mock of a wrapper or library mock.
      // For skeleton, we verify render and logic path for tenant lookup.

      // Mock global env
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';

      // Spy on nodemailer
      const loggerSpy = jest
        .spyOn(require('nodemailer'), 'createTransport')
        .mockReturnValue({
          sendMail: jest.fn().mockResolvedValue({ messageId: '123' }),
        });

      await service.sendMail(null, {
        to: 'test@test.com',
        template: 'onboarding',
        context: { name: 'Bob', tenantName: 'T', setupLink: 'x' },
      });
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});

