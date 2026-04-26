import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class DomainRedirectRule {
  @IsString()
  from!: string;

  @IsString()
  to!: string;
}

export class UpdateDomainDto {
  @ApiPropertyOptional({
    description: 'Custom domain for the tenant (e.g., careers.company.com)',
  })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional({
    description: 'Domain redirect rules',
    type: [DomainRedirectRule],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DomainRedirectRule)
  domainRedirectRules?: DomainRedirectRule[];
}
