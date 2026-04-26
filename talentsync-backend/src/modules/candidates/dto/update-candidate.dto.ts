import { IsOptional, IsString, IsEmail, IsArray } from 'class-validator';

export class UpdateCandidateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() roleTitle?: string;
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsArray() tags?: string[];
}
