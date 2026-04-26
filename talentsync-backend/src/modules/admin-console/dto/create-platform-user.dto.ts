import { IsEmail, IsString, IsOptional } from 'class-validator';

export class CreatePlatformUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  role: 'SUPERADMIN' | 'SUPPORT';

  @IsOptional()
  @IsString()
  password?: string; // if omitted, generate random and email temp password
}
