import {
  IsBoolean,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class UpdateSecurityPolicyDto {
  @IsOptional()
  @IsBoolean()
  ipAllowlistEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIPs?: string[];

  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(128)
  passwordMinLength?: number;

  @IsOptional()
  @IsBoolean()
  passwordRequireUppercase?: boolean;

  @IsOptional()
  @IsBoolean()
  passwordRequireLowercase?: boolean;

  @IsOptional()
  @IsBoolean()
  passwordRequireNumber?: boolean;

  @IsOptional()
  @IsBoolean()
  passwordRequireSymbol?: boolean;

  @IsOptional()
  @IsNumber()
  passwordMaxAgeDays?: number;

  @IsOptional()
  @IsNumber()
  maxConcurrentSessions?: number;

  @IsOptional()
  @IsNumber()
  sessionTimeoutMinutes?: number;
}
