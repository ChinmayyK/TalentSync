import { IsObject, IsString } from 'class-validator';

export class ZohoFieldMapDto {
  @IsString()
  module: 'leads' | 'contacts';

  @IsObject()
  mapping: Record<string, string>;
}
