import { IsString } from 'class-validator';

export class ZohoAuthDto {
  @IsString()
  code: string;

  @IsString()
  redirectUri: string;
}
