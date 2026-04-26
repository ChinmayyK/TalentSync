/**
 * Migration Validation Script
 * 
 * Validates imported data for integrity and completeness.
 * 
 * Usage:
 * DATABASE_URL=xxx npx ts-node scripts/migration-validate.ts --tenant tenant_123 --migration migration_xxx
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationResult {
    valid: boolean;
    totalRecords: number;
    issues: {
        type: string;
        count: number;
        examples: string[];
    }[];
}

async function validateMigration(
    tenantId: string,
    migrationId?: string
): Promise<ValidationResult> {
    const result: ValidationResult = {
        valid: true,
        totalRecords: 0,
        issues: [],
    };

    console.log(`🔍 Validating migration for tenant ${tenantId}...`);

    // Build query
    const where: any = { tenantId };
    if (migrationId) {
        where.metadata = { path: ['migrationId'], equals: migrationId };
    }

    const candidates = await prisma.candidate.findMany({ where });
    result.totalRecords = candidates.length;

    console.log(`   Found ${candidates.length} candidates to validate`);

    // Check for missing required fields
    const missingEmail = candidates.filter(c => !c.email);
    if (missingEmail.length > 0) {
        result.valid = false;
        result.issues.push({
            type: 'MISSING_EMAIL',
            count: missingEmail.length,
            examples: missingEmail.slice(0, 3).map(c => c.id),
        });
    }

    const missingName = candidates.filter(c => !c.name);
    if (missingName.length > 0) {
        result.issues.push({
            type: 'MISSING_NAME',
            count: missingName.length,
            examples: missingName.slice(0, 3).map(c => c.id),
        });
    }

    // Check for duplicate emails
    const emailCounts = new Map<string, number>();
    candidates.forEach(c => {
        const email = c.email.toLowerCase();
        emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
    });
    const duplicates = [...emailCounts.entries()].filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
        result.valid = false;
        result.issues.push({
            type: 'DUPLICATE_EMAILS',
            count: duplicates.length,
            examples: duplicates.slice(0, 3).map(([email]) => email),
        });
    }

    // Check for invalid stages
    const validStages = ['applied', 'screening', 'interview', 'interview_1', 'interview_2', 'hr_round', 'offer', 'hired', 'rejected'];
    const invalidStages = candidates.filter(c => !validStages.includes(c.stage?.toLowerCase() || ''));
    if (invalidStages.length > 0) {
        result.issues.push({
            type: 'INVALID_STAGE',
            count: invalidStages.length,
            examples: invalidStages.slice(0, 3).map(c => `${c.email}: ${c.stage}`),
        });
    }

    // Check for invalid email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = candidates.filter(c => c.email && !emailRegex.test(c.email));
    if (invalidEmails.length > 0) {
        result.issues.push({
            type: 'INVALID_EMAIL_FORMAT',
            count: invalidEmails.length,
            examples: invalidEmails.slice(0, 3).map(c => c.email),
        });
    }

    return result;
}

async function main() {
    const args = process.argv.slice(2);
    const tenantIndex = args.indexOf('--tenant');
    const migrationIndex = args.indexOf('--migration');

    const tenantId = args[tenantIndex + 1];
    const migrationId = migrationIndex !== -1 ? args[migrationIndex + 1] : undefined;

    if (!tenantId) {
        console.error('Usage: --tenant <tenantId> [--migration <migrationId>]');
        process.exit(1);
    }

    try {
        const result = await validateMigration(tenantId, migrationId);

        console.log('\n📊 Validation Results:');
        console.log(`   Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
        console.log(`   Total Records: ${result.totalRecords}`);

        if (result.issues.length > 0) {
            console.log('\n⚠️  Issues Found:');
            result.issues.forEach(issue => {
                console.log(`   ${issue.type}: ${issue.count} records`);
                issue.examples.forEach(ex => console.log(`     - ${ex}`));
            });
        } else {
            console.log('\n✅ No issues found');
        }

        process.exit(result.valid ? 0 : 1);
    } catch (error: any) {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
