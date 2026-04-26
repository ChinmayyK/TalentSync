import { IsString } from 'class-validator';

export class TestSmtpDto {
  @IsString() to: string;
}
