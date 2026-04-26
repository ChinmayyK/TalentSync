import { IsString, IsOptional } from 'class-validator';

export class UpdateSmtpDto {
  @IsString() host: string;
  @IsString() port: string;
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsString() password?: string; // encrypted at rest
  @IsOptional() @IsString() fromAddress?: string;
  @IsOptional() @IsString() secure?: string; // 'true' | 'false'
}
