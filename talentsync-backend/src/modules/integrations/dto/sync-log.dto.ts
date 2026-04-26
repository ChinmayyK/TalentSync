import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * Response DTO for sync log entries
 */
export class SyncLogResponseDto {
    @ApiProperty({ description: 'Unique log ID' })
    id: string;

    @ApiProperty({ description: 'Tenant ID' })
    tenantId: string;

    @ApiProperty({ description: 'Integration provider' })
    provider: string;

    @ApiProperty({ description: 'Event type that triggered this sync' })
    eventType: string;

    @ApiProperty({ description: 'Sync direction', enum: ['OUTBOUND', 'INBOUND'] })
    direction: string;

    @ApiProperty({ description: 'Entity type being synced', enum: ['CANDIDATE', 'INTERVIEW', 'JOB'] })
    entityType: string;

    @ApiPropertyOptional({ description: 'Internal entity ID' })
    entityId?: string;

    @ApiPropertyOptional({ description: 'External system ID' })
    externalId?: string;

    @ApiProperty({ description: 'Sync status', enum: ['PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'RETRYING'] })
    status: string;

    @ApiPropertyOptional({ description: 'Error message if failed' })
    errorMessage?: string;

    @ApiProperty({ description: 'Number of retry attempts' })
    retryCount: number;

    @ApiProperty({ description: 'When the sync was initiated' })
    createdAt: Date;

    @ApiPropertyOptional({ description: 'When the sync completed' })
    completedAt?: Date;
}

/**
 * Response DTO for sync log summary
 */
export class SyncLogSummaryDto {
    @ApiProperty({ description: 'Total sync attempts in last 24h' })
    total: number;

    @ApiProperty({ description: 'Successful syncs' })
    success: number;

    @ApiProperty({ description: 'Failed syncs' })
    failed: number;

    @ApiProperty({ description: 'Pending/in-progress syncs' })
    pending: number;

    @ApiProperty({ description: 'Success rate percentage' })
    successRate: number;
}

/**
 * Response DTO for error summary
 */
export class ErrorSummaryDto {
    @ApiProperty({
        description: 'Recent errors grouped by message',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                count: { type: 'number' },
                lastOccurred: { type: 'string', format: 'date-time' },
            },
        },
    })
    recentErrors: { message: string; count: number; lastOccurred: Date }[];

    @ApiProperty({ description: 'Total failures in last 24h' })
    totalFailures24h: number;
}

/**
 * Response DTO for integration status
 */
export class IntegrationStatusDto {
    @ApiProperty({ description: 'Whether the integration is connected' })
    connected: boolean;

    @ApiProperty({ description: 'Integration provider' })
    provider: string;

    @ApiPropertyOptional({ description: 'Last successful sync timestamp' })
    lastSyncAt?: Date;

    @ApiProperty({ description: 'Provider capabilities' })
    capabilities: {
        candidateSync: string;
        jobSync: string;
        interviewSync: string;
        supportsWebhooks: boolean;
    };

    @ApiProperty({ description: 'Sync statistics for last 24h' })
    stats: SyncLogSummaryDto;
}

/**
 * Query DTO for sync logs
 */
export class GetSyncLogsQueryDto {
    @ApiPropertyOptional({ description: 'Maximum number of logs to return', default: 50 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(200)
    limit?: number;

    @ApiPropertyOptional({ description: 'Filter by status' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Filter by entity type' })
    @IsOptional()
    @IsString()
    entityType?: string;
}
