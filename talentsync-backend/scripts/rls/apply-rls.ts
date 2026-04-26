/**
 * Script to apply Row Level Security (RLS) policies to all tenant-scoped tables
 * Run with: npx ts-node scripts/rls/apply-rls.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyRLS() {
    console.log('Applying Row Level Security (RLS) policies...\n');

    // Step 1: Create helper functions
    console.log('Step 1: Creating RLS helper functions...');
    await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id TEXT)
        RETURNS void AS $$
        BEGIN
            PERFORM set_config('app.current_tenant_id', tenant_id, false);
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION get_current_tenant()
        RETURNS TEXT AS $$
        BEGIN
            RETURN current_setting('app.current_tenant_id', true);
        END;
        $$ LANGUAGE plpgsql STABLE;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION is_superadmin()
        RETURNS BOOLEAN AS $$
        BEGIN
            RETURN current_setting('app.is_superadmin', true) = 'true';
        END;
        $$ LANGUAGE plpgsql STABLE;
    `);
    console.log('✓ Helper functions created\n');

    // Step 2: Get list of tables with tenantId column
    console.log('Step 2: Finding tables with tenantId column...');
    const tablesWithTenantId = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenantId' 
        AND table_schema = 'public'
        ORDER BY table_name;
    `;
    console.log(`Found ${tablesWithTenantId.length} tables with tenantId\n`);

    // Step 3: Enable RLS on each table
    console.log('Step 3: Enabling RLS on tables...');
    for (const { table_name } of tablesWithTenantId) {
        try {
            // Enable RLS
            await prisma.$executeRawUnsafe(`ALTER TABLE "${table_name}" ENABLE ROW LEVEL SECURITY;`);

            // Drop existing policies (if any) to avoid conflicts
            await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${table_name}_tenant_isolation" ON "${table_name}";`);
            await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${table_name}_tenant_insert" ON "${table_name}";`);

            // Create isolation policy (SELECT, UPDATE, DELETE)
            await prisma.$executeRawUnsafe(`
                CREATE POLICY "${table_name}_tenant_isolation" ON "${table_name}"
                FOR ALL
                USING ("tenantId" = get_current_tenant() OR is_superadmin());
            `);

            // Force RLS for table owner too
            await prisma.$executeRawUnsafe(`ALTER TABLE "${table_name}" FORCE ROW LEVEL SECURITY;`);

            console.log(`✓ ${table_name}`);
        } catch (e: any) {
            console.log(`✗ ${table_name}: ${e.message}`);
        }
    }

    console.log('\n=== RLS Setup Complete ===');
    console.log(`Enabled RLS on ${tablesWithTenantId.length} tables`);
    console.log('\nTo test:');
    console.log("  SELECT set_current_tenant('your-tenant-id');");
    console.log('  SELECT * FROM "Candidate"; -- Only shows tenant\'s data');
}

applyRLS()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
