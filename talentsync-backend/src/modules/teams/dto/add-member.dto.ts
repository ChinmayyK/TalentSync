import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TeamRole {
  TEAM_LEAD = 'TEAM_LEAD',
  TEAM_MEMBER = 'TEAM_MEMBER',
}

export class AddMemberDto {
  @ApiProperty({ description: 'User ID to add', example: 'user-123' })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Team role override',
    enum: TeamRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole;
}
