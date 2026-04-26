import { Injectable, BadRequestException } from '@nestjs/common';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  score: number; // 0-100
  suggestions: string[];
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  disallowCommonPasswords: boolean;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
  disallowCommonPasswords: true,
};

// Common weak passwords to check against
const COMMON_PASSWORDS = [
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  'qwerty',
  'qwerty123',
  'letmein',
  'welcome',
  'admin',
  'admin123',
  'pass1234',
  'changeme',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'master',
  'dragon',
  'michael',
  'shadow',
  'monkey',
  'jennifer',
  'abc123',
  '111111',
  '1234567890',
];

@Injectable()
export class PasswordPolicyService {
  /**
   * Validate password against policy
   */
  validatePassword(
    password: string,
    policy: Partial<PasswordPolicy> = {},
  ): PasswordValidationResult {
    const effectivePolicy = { ...DEFAULT_POLICY, ...policy };
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Check minimum length
    if (password.length < effectivePolicy.minLength) {
      errors.push(
        `Password must be at least ${effectivePolicy.minLength} characters long`,
      );
    } else {
      score += 20;
    }

    // Check maximum length
    if (password.length > effectivePolicy.maxLength) {
      errors.push(
        `Password must be at most ${effectivePolicy.maxLength} characters long`,
      );
    }

    // Check uppercase
    if (effectivePolicy.requireUppercase) {
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      } else {
        score += 15;
      }
    }

    // Check lowercase
    if (effectivePolicy.requireLowercase) {
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      } else {
        score += 15;
      }
    }

    // Check number
    if (effectivePolicy.requireNumber) {
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
      } else {
        score += 15;
      }
    }

    // Check symbol
    if (effectivePolicy.requireSymbol) {
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
        errors.push(
          'Password must contain at least one special character (!@#$%^&*...)',
        );
      } else {
        score += 20;
      }
    }

    // Check common passwords
    if (effectivePolicy.disallowCommonPasswords) {
      if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
        errors.push(
          'Password is too common. Please choose a stronger password',
        );
        score = Math.max(0, score - 50);
      }
    }

    // Additional strength checks for bonus score
    if (password.length >= 12) {
      score += 10;
    }
    if (password.length >= 16) {
      score += 5;
    }

    // Check for sequential characters (123, abc)
    if (/(.)\1{2,}/.test(password)) {
      suggestions.push('Avoid repeating the same character multiple times');
      score = Math.max(0, score - 10);
    }

    // Check for sequential numbers or letters
    if (/(?:012|123|234|345|456|567|678|789|abc|bcd|cde|def)/i.test(password)) {
      suggestions.push('Avoid sequential characters like "123" or "abc"');
      score = Math.max(0, score - 10);
    }

    // Generate suggestions
    if (password.length < 12) {
      suggestions.push('Consider using a longer password for better security');
    }
    if (!/[!@#$%^&*]/.test(password) && !/[0-9]/.test(password)) {
      suggestions.push(
        'Add numbers and special characters for stronger security',
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      score: Math.min(100, Math.max(0, score)),
      suggestions,
    };
  }

  /**
   * Enforce password policy - throws BadRequestException if invalid
   */
  enforcePolicy(password: string, policy?: Partial<PasswordPolicy>): void {
    const result = this.validatePassword(password, policy);
    if (!result.valid) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Password does not meet security requirements',
        errors: result.errors,
        code: 'INVALID_PASSWORD',
      });
    }
  }

  /**
   * Get password strength label
   */
  getStrengthLabel(score: number): string {
    if (score >= 80) return 'strong';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'weak';
    return 'very weak';
  }

  /**
   * Get the default policy
   */
  getDefaultPolicy(): PasswordPolicy {
    return { ...DEFAULT_POLICY };
  }
}

// DTO for password check endpoint
export class CheckPasswordDto {
  password: string;
}

export interface CheckPasswordResponse {
  valid: boolean;
  errors: string[];
  score: number;
  strength: string;
  suggestions: string[];
  policy: PasswordPolicy;
}
