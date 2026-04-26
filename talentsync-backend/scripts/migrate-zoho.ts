/**
 * TalentSync Data Import Script
 * 
 * Imports exported data into TalentSync database.
 * 
 * Usage:
 * DATABASE_URL=xxx npx ts-node scripts/migrate-zoho.ts --input ./migration-data/candidates_xxx.json --tenant tenant_123
 * 
 * Options:
 *   --input     Path to exported JSON file
 *   --tenant    Target tenant ID
 *   --dry-run   Validate without inserting
 *   --rollback  Delete imported records by migration ID
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface MigrationCandidate {
    name: string;
    email: string;
    phone?: string;
    stage: string;
    source?: string;
    roleTitle?: string;
    notes?: string;
    externalId?: string;
    externalSource?: string;
    metadata?: any;
}

interface MigrationResult {
    migrationId: string;
    totalRecords: number;
    inserted: number;
    skipped: number;
    errors: { email: string; error: string }[];
}

async function importCandidates(
    inputFile: string,
    tenantId: string,
    dryRun: boolean = false
): Promise<MigrationResult> {
    const migrationId = `migration_${Date.now()}`;
    const result: MigrationResult = {
        migrationId,
        totalRecords: 0,
        inserted: 0,
        skipped: 0,
        errors: [],
    };

    // Read input file
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8')) as MigrationCandidate[];
    result.totalRecords = data.length;

    console.log(`📥 Importing ${data.length} candidates to tenant ${tenantId}...`);
    if (dryRun) console.log('   (DRY RUN - no changes will be made)');

    // Validate tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
    }

    // Get existing candidates to check for duplicates
    const existingEmails = new Set(
        (await prisma.candidate.findMany({
            where: { tenantId },
            select: { email: true },
        })).map(c => c.email.toLowerCase())
    );

    // Import each candidate
    for (const candidate of data) {
        try {
            // Skip if email already exists
            if (existingEmails.has(candidate.email.toLowerCase())) {
                result.skipped++;
                continue;
            }

            if (!dryRun) {
                await prisma.candidate.create({
                    data: {
                        tenantId,
                        name: candidate.name,
                        email: candidate.email,
                        phone: candidate.phone || null,
                        stage: candidate.stage.toLowerCase(),
                        source: candidate.source || 'Migration',
                        roleTitle: candidate.roleTitle || null,
                        notes: candidate.notes || null,
                        externalId: candidate.externalId,
                        externalSource: candidate.externalSource || 'zoho-creator',
                        metadata: {
                            ...(candidate.metadata || {}),
                            migrationId,
                        },
                    },
                });
            }

            result.inserted++;
            existingEmails.add(candidate.email.toLowerCase());

            if (result.inserted % 100 === 0) {
                console.log(`   Processed ${result.inserted}/${data.length}...`);
            }
        } catch (error: any) {
            result.errors.push({
                email: candidate.email,
                error: error.message,
            });
        }
    }

    // Log migration for audit
    if (!dryRun) {
        await prisma.auditLog.create({
            data: {
                tenantId,
                action: 'migration.candidates.import',
                metadata: {
                    migrationId,
                    inputFile,
                    totalRecords: result.totalRecords,
                    inserted: result.inserted,
                    skipped: result.skipped,
                    errors: result.errors.length,
                },
            },
        });
    }

    return result;
}

async function rollbackMigration(migrationId: string, tenantId: string): Promise<number> {
    console.log(`🔙 Rolling back migration ${migrationId}...`);

    const deleted = await prisma.candidate.deleteMany({
        where: {
            tenantId,
            metadata: {
                path: ['migrationId'],
                equals: migrationId,
            },
        },
    });

    // Log rollback
    await prisma.auditLog.create({
        data: {
            tenantId,
            action: 'migration.candidates.rollback',
            metadata: { migrationId, deletedCount: deleted.count },
        },
    });

    console.log(`✅ Deleted ${deleted.count} records`);
    return deleted.count;
}

// CLI Entry Point
async function main() {
    const args = process.argv.slice(2);

    const inputIndex = args.indexOf('--input');
    const tenantIndex = args.indexOf('--tenant');
    const dryRun = args.includes('--dry-run');
    const rollbackIndex = args.indexOf('--rollback');

    try {
        if (rollbackIndex !== -1) {
            // Rollback mode
            const migrationId = args[rollbackIndex + 1];
            const tenantId = args[tenantIndex + 1];
            if (!migrationId || !tenantId) {
                console.error('Usage: --rollback <migrationId> --tenant <tenantId>');
                process.exit(1);
            }
            await rollbackMigration(migrationId, tenantId);
        } else {
            // Import mode
            const inputFile = args[inputIndex + 1];
            const tenantId = args[tenantIndex + 1];

            if (!inputFile || !tenantId) {
                console.error('Usage: --input <file.json> --tenant <tenantId> [--dry-run]');
                process.exit(1);
            }

            const result = await importCandidates(inputFile, tenantId, dryRun);

            console.log('\n🎉 Migration complete!');
            console.log(`   Migration ID: ${result.migrationId}`);
            console.log(`   Total: ${result.totalRecords}`);
            console.log(`   Inserted: ${result.inserted}`);
            console.log(`   Skipped (duplicates): ${result.skipped}`);
            console.log(`   Errors: ${result.errors.length}`);

            if (result.errors.length > 0) {
                console.log('\n⚠️  Errors:');
                result.errors.slice(0, 10).forEach(e => console.log(`   - ${e.email}: ${e.error}`));
                if (result.errors.length > 10) {
                    console.log(`   ... and ${result.errors.length - 10} more`);
                }
            }
        }
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
