import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordCheckDto {
  @ApiProperty({
    example: 'StrongP@ssw0rd123!',
    description: 'Password to check against policy',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
