import { IsString, IsOptional } from 'class-validator';

export class CreateTenantProvisionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  initialAdminEmail?: string; // email to create as tenant admin
}

