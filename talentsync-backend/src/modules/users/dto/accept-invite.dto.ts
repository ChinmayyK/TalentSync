import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty({ description: 'Invitation token', example: 'a1b2c3d4e5f6...' })
  @IsString()
  token: string;

  @ApiProperty({
    description:
      'Password (min 8 chars, must include uppercase, lowercase, number, special char)',
    example: 'SecurePass123!',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;
}

