import { IsString } from 'class-validator';

export class VerifyDomainDto {
  @IsString()
  token: string;
}
