/**
 * Zoho Creator Data Export Script
 * 
 * Exports data from Zoho Creator for migration to TalentSync.
 * 
 * Usage:
 * ZOHO_CLIENT_ID=xxx ZOHO_CLIENT_SECRET=xxx ZOHO_REFRESH_TOKEN=xxx \
 *   npx ts-node scripts/zoho-export.ts --output ./migration-data
 * 
 * Prerequisites:
 * 1. Create a Zoho API Console app (Self Client)
 * 2. Generate refresh token with scopes: ZohoCreator.report.READ, ZohoCreator.form.READ
 */

import * as fs from 'fs';
import * as path from 'path';

interface ZohoConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    appName: string;
    reportName: string;
}

interface ExportResult {
    totalRecords: number;
    exportedAt: string;
    outputFile: string;
}

class ZohoExporter {
    private accessToken: string | null = null;
    private config: ZohoConfig;

    constructor(config: ZohoConfig) {
        this.config = config;
    }

    async refreshAccessToken(): Promise<string> {
        const tokenUrl = 'https://accounts.zoho.com/oauth/v2/token';
        const params = new URLSearchParams({
            refresh_token: this.config.refreshToken,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            grant_type: 'refresh_token',
        });

        const response = await fetch(tokenUrl, {
            method: 'POST',
            body: params,
        });

        if (!response.ok) {
            throw new Error(`Failed to refresh token: ${response.statusText}`);
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        return this.accessToken!;
    }

    async exportCandidates(outputDir: string): Promise<ExportResult> {
        if (!this.accessToken) {
            await this.refreshAccessToken();
        }

        const apiUrl = `https://creator.zoho.com/api/v2/chinmaykudalkar/${this.config.appName}/report/${this.config.reportName}`;

        const allRecords: any[] = [];
        let hasMore = true;
        let startIndex = 0;
        const pageSize = 200;

        console.log('📤 Exporting candidates from Zoho Creator...');

        while (hasMore) {
            const response = await fetch(`${apiUrl}?from=${startIndex}&limit=${pageSize}`, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${this.accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            const data = await response.json();
            const records = data.data || [];
            allRecords.push(...records);

            console.log(`  Fetched ${allRecords.length} records...`);

            hasMore = records.length === pageSize;
            startIndex += pageSize;
        }

        // Transform to TalentSync schema
        const transformedData = allRecords.map(record => this.transformCandidate(record));

        // Write to file
        const outputFile = path.join(outputDir, `candidates_${Date.now()}.json`);
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(outputFile, JSON.stringify(transformedData, null, 2));

        console.log(`✅ Exported ${transformedData.length} candidates to ${outputFile}`);

        return {
            totalRecords: transformedData.length,
            exportedAt: new Date().toISOString(),
            outputFile,
        };
    }

    private transformCandidate(zohoRecord: any): any {
        // Map Zoho Creator fields to TalentSync schema
        return {
            name: zohoRecord.Name || zohoRecord.Candidate_Name || '',
            email: zohoRecord.Email || zohoRecord.Email_ID || '',
            phone: zohoRecord.Phone || zohoRecord.Contact_Number || '',
            stage: this.mapStage(zohoRecord.Status || zohoRecord.Stage || 'APPLIED'),
            source: zohoRecord.Source || 'Zoho Creator Migration',
            roleTitle: zohoRecord.Role || zohoRecord.Position || '',
            notes: zohoRecord.Notes || zohoRecord.Comments || '',
            // Preserve original Zoho ID for reference
            externalId: zohoRecord.ID,
            externalSource: 'zoho-creator',
            metadata: {
                originalRecord: zohoRecord,
                migratedAt: new Date().toISOString(),
            },
        };
    }

    private mapStage(zohoStage: string): string {
        const stageMapping: Record<string, string> = {
            'New': 'APPLIED',
            'Screening': 'SCREENING',
            'Interview': 'INTERVIEW',
            'Interview Scheduled': 'INTERVIEW',
            'Technical': 'INTERVIEW_1',
            'HR Round': 'HR_ROUND',
            'Offered': 'OFFER',
            'Hired': 'HIRED',
            'Rejected': 'REJECTED',
            'On Hold': 'SCREENING',
        };
        return stageMapping[zohoStage] || 'APPLIED';
    }
}

// CLI Entry Point
async function main() {
    const args = process.argv.slice(2);
    const outputIndex = args.indexOf('--output');
    const outputDir = outputIndex !== -1 ? args[outputIndex + 1] : './migration-data';

    // Validate environment
    const requiredEnvVars = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'];
    const missing = requiredEnvVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        console.error('\nUsage:');
        console.error('  ZOHO_CLIENT_ID=xxx ZOHO_CLIENT_SECRET=xxx ZOHO_REFRESH_TOKEN=xxx \\');
        console.error('    npx ts-node scripts/zoho-export.ts --output ./migration-data');
        process.exit(1);
    }

    const exporter = new ZohoExporter({
        clientId: process.env.ZOHO_CLIENT_ID!,
        clientSecret: process.env.ZOHO_CLIENT_SECRET!,
        refreshToken: process.env.ZOHO_REFRESH_TOKEN!,
        appName: process.env.ZOHO_APP_NAME || 'talentsync',
        reportName: process.env.ZOHO_REPORT_NAME || 'All_Candidates',
    });

    try {
        const result = await exporter.exportCandidates(outputDir);
        console.log('\n🎉 Export complete!');
        console.log(`   Records: ${result.totalRecords}`);
        console.log(`   Output: ${result.outputFile}`);
    } catch (error) {
        console.error('❌ Export failed:', error);
        process.exit(1);
    }
}

main();
