import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsInt,
  Min,
  ValidateNested,
  IsObject,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsTimezone } from '../../../common/validators/timezone.validator';

// Slot participant structure
export class SlotParticipantDto {
  @ApiProperty({
    description: 'Participant type',
    example: 'user',
    enum: ['user', 'candidate'],
  })
  @IsString()
  type: 'user' | 'candidate';

  @ApiProperty({ description: 'Participant ID', example: 'user_abc123' })
  @IsString()
  id: string;

  @ApiPropertyOptional({
    description: 'Participant email',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Participant phone',
    example: '+1 555-123-4567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Participant name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;
}

// Create a single slot directly
export class CreateSlotDto {
  @ApiProperty({
    description: 'Slot participants (interviewers and/or candidates)',
    type: [SlotParticipantDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotParticipantDto)
  participants: SlotParticipantDto[];

  @ApiProperty({
    description: 'Slot start time in ISO format',
    example: '2024-01-15T14:00:00Z',
  })
  @IsDateString()
  startAt: string;

  @ApiProperty({
    description: 'Slot end time in ISO format',
    example: '2024-01-15T15:00:00Z',
  })
  @IsDateString()
  endAt: string;

  @ApiProperty({ description: 'Timezone', example: 'Asia/Kolkata' })
  @IsTimezone()
  timezone: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { roomId: 'conf-a' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// Generate multiple available slots
export class GenerateSlotsDto {
  @ApiProperty({
    description: 'Interviewer user IDs to generate slots for',
    example: ['user_123', 'user_456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({
    description: 'Start of date range for slot generation',
    example: '2024-01-15T00:00:00Z',
  })
  @IsDateString()
  startRange: string;

  @ApiProperty({
    description: 'End of date range for slot generation',
    example: '2024-01-20T23:59:59Z',
  })
  @IsDateString()
  endRange: string;

  @ApiProperty({
    description: 'Duration of each slot in minutes',
    example: 60,
    minimum: 15,
  })
  @IsInt()
  @Min(15)
  slotDurationMins: number;

  @ApiPropertyOptional({
    description: 'Scheduling rule ID to use',
    example: 'rule_abc123',
  })
  @IsOptional()
  @IsString()
  ruleId?: string;

  @ApiProperty({
    description: 'Timezone for slot generation',
    example: 'Asia/Kolkata',
  })
  @IsTimezone()
  timezone: string;

  @ApiPropertyOptional({
    description: 'Maximum number of slots to generate (default: 50, max: 100)',
    example: 50,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSlots?: number;
}

// Book an existing slot
export class BookSlotDto {
  @ApiPropertyOptional({
    description: 'Link to existing interview ID',
    example: 'int_abc123',
  })
  @IsOptional()
  @IsString()
  interviewId?: string;

  @ApiProperty({
    description: 'Candidate details for booking',
    type: SlotParticipantDto,
  })
  @ValidateNested()
  @Type(() => SlotParticipantDto)
  candidate: SlotParticipantDto;

  @ApiPropertyOptional({
    description: 'Existing candidate ID to link',
    example: 'cand_abc123',
  })
  @IsOptional()
  @IsString()
  candidateId?: string;

  @ApiPropertyOptional({
    description: 'Additional booking metadata',
    example: { source: 'calendar' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Force booking even if slot overlaps with busy time (Admin only). Returns warning in response.',
    example: false,
    default: false,
  })
  @IsOptional()
  forceBook?: boolean;
}

// Reschedule a booked slot
export class RescheduleSlotDto {
  @ApiProperty({
    description: 'New start time in ISO format',
    example: '2024-01-16T14:00:00Z',
  })
  @IsDateString()
  newStartAt: string;

  @ApiProperty({
    description: 'New end time in ISO format',
    example: '2024-01-16T15:00:00Z',
  })
  @IsDateString()
  newEndAt: string;

  @ApiPropertyOptional({
    description: 'Reason for rescheduling',
    example: 'Interviewer conflict',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Query slots
export class SlotQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by slot status',
    enum: ['AVAILABLE', 'BOOKED', 'CANCELLED', 'EXPIRED'],
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsString()
  status?: 'AVAILABLE' | 'BOOKED' | 'CANCELLED' | 'EXPIRED';

  @ApiPropertyOptional({
    description: 'Filter by user/interviewer ID',
    example: 'user_123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter slots starting from this date',
    example: '2024-01-15T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  start?: string;

  @ApiPropertyOptional({
    description: 'Filter slots ending before this date',
    example: '2024-01-20T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  end?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  perPage?: number;
}
