import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Custom validator constraint for IANA timezone strings
 * Uses Intl.DateTimeFormat to validate timezone identifiers
 */
@ValidatorConstraint({ name: 'isTimezone', async: false })
export class IsTimezoneConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string' || value.trim() === '') {
      return false;
    }

    try {
      // Intl.DateTimeFormat throws if the timezone is invalid
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return '$property must be a valid IANA timezone (e.g., "America/New_York", "Asia/Kolkata", "Europe/London", "UTC")';
  }
}

/**
 * Custom decorator for validating IANA timezone strings
 *
 * Usage:
 * ```typescript
 * @IsTimezone()
 * timezone: string;
 * ```
 *
 * Valid examples: "America/New_York", "Asia/Kolkata", "Europe/London", "UTC"
 * Invalid examples: "EST", "Foo/Bar", "invalid"
 */
export function IsTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTimezone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTimezoneConstraint,
    });
  };
}

