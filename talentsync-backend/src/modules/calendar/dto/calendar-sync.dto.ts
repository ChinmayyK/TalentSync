import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalendarConnectDto {
  @ApiProperty({ description: 'OAuth redirect URI' })
  @IsString()
  redirectUri: string;
}

export class CalendarCallbackDto {
  @ApiProperty({ description: 'OAuth authorization code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'OAuth redirect URI used in authorize' })
  @IsString()
  redirectUri: string;
}

export class CalendarAccountDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['google', 'microsoft'] })
  provider: string;

  @ApiProperty()
  providerAccountId: string;

  @ApiProperty()
  syncEnabled: boolean;

  @ApiPropertyOptional()
  lastSyncAt: Date | null;
}

export class ToggleSyncDto {
  @ApiProperty({ description: 'Enable or disable sync' })
  @IsBoolean()
  enabled: boolean;
}

export class SyncResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  eventsProcessed: number;
}

export class AuthUrlResponseDto {
  @ApiProperty({ description: 'OAuth authorization URL' })
  authUrl: string;
}

export class ConnectedAccountsResponseDto {
  @ApiProperty({ type: [CalendarAccountDto] })
  accounts: CalendarAccountDto[];
}
