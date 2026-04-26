import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchTenantDto {
  @ApiProperty({
    description: 'Tenant ID to switch to',
    example: 'clpxxxxxxxx',
  })
  @IsString()
  tenantId: string;
}
