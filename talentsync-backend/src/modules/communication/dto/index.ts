import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsDate,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Channel,
  RecipientType,
  MessageStatus,
  TemplateCategory,
  AutomationTrigger,
  ScheduleStatus,
} from '@prisma/client';

// ============================================
// MESSAGE DTOs
// ============================================

export class SendMessageDto {
  @ApiProperty({ enum: Channel })
  @IsEnum(Channel)
  channel: Channel;

  @ApiProperty({ enum: RecipientType })
  @IsEnum(RecipientType)
  recipientType: RecipientType;

  @ApiProperty()
  @IsString()
  recipientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class ScheduleMessageDto extends SendMessageDto {
  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  scheduledFor: Date;
}

export class MessageFilterDto {
  @ApiPropertyOptional({ enum: Channel })
  @IsOptional()
  @IsEnum(Channel)
  channel?: Channel;

  @ApiPropertyOptional({ enum: MessageStatus })
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @ApiPropertyOptional({ enum: RecipientType })
  @IsOptional()
  @IsEnum(RecipientType)
  recipientType?: RecipientType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number = 20;
}

// ============================================
// TEMPLATE DTOs
// ============================================

export class CreateTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: Channel })
  @IsEnum(Channel)
  channel: Channel;

  @ApiProperty({ enum: TemplateCategory })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

export class UpdateTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

export class PreviewTemplateDto {
  @ApiProperty()
  @IsObject()
  context: Record<string, any>;
}

// ============================================
// AUTOMATION DTOs
// ============================================

export class CreateAutomationDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: AutomationTrigger })
  @IsEnum(AutomationTrigger)
  trigger: AutomationTrigger;

  @ApiProperty({ enum: Channel })
  @IsEnum(Channel)
  channel: Channel;

  @ApiProperty()
  @IsString()
  templateId: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  delay?: number; // minutes

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;
}

export class UpdateAutomationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  delay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

// ============================================
// CHANNEL CONFIG DTOs
// ============================================

export class EmailConfigDto {
  @ApiProperty()
  @IsString()
  provider: 'smtp' | 'ses';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional()
  @IsOptional()
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  secure?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromName?: string;

  // For SES
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessKeyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secretAccessKey?: string;
}

export class WhatsAppConfigDto {
  @ApiProperty()
  @IsString()
  businessId: string;

  @ApiProperty()
  @IsString()
  phoneNumberId: string;

  @ApiProperty()
  @IsString()
  accessToken: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  webhookVerifyToken?: string;
}

export class SMSConfigDto {
  @ApiProperty()
  @IsString()
  provider: 'twilio';

  @ApiProperty()
  @IsString()
  accountSid: string;

  @ApiProperty()
  @IsString()
  authToken: string;

  @ApiProperty()
  @IsString()
  fromNumber: string;
}

export class ChannelConfigDto {
  @ApiProperty({ enum: Channel })
  @IsEnum(Channel)
  channel: Channel;

  @ApiProperty()
  @IsObject()
  credentials: EmailConfigDto | WhatsAppConfigDto | SMSConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

// ============================================
// STATS DTOs
// ============================================

export class CommunicationStatsDto {
  totalSent: number;
  totalPending: number;
  totalFailed: number;
  totalScheduled: number;
  byChannel: {
    email: number;
    whatsapp: number;
    sms: number;
  };
  recentActivity: any[];
}
