import { IsString } from 'class-validator';

export class GenerateDomainTokenDto {
  @IsString()
  domain: string;
}
