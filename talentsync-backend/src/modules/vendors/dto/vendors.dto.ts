import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { VendorStatus } from '@prisma/client';

export class CreateVendorDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  website?: string;
}

export class UpdateVendorDto extends CreateVendorDto {
  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus;
}

export class InviteVendorUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;
}

export class AssignJobDto {
  @IsString()
  jobId: string;

  @IsString()
  @IsOptional()
  commissionType?: string; // 'FLAT' | 'PERCENTAGE'

  @IsNumber()
  @IsOptional()
  commissionValue?: number;
}
