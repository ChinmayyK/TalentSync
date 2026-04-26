-- TalentSync Application: Row Level Security (RLS) Migration
-- This script enables RLS for multi-tenant data isolation
-- Run after Prisma migrations

-- =====================================================
-- STEP 1: Create tenant context functions
-- =====================================================

-- Function to set current tenant in session
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current tenant from session
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- STEP 2: Enable RLS on all tenant-scoped tables
-- =====================================================

-- User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_tenant_isolation ON "User"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY user_tenant_insert ON "User"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- Team table
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_tenant_isolation ON "Team"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY team_tenant_insert ON "Team"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- TeamMember table
ALTER TABLE "TeamMember" ENABLE ROW LEVEL SECURITY;
CREATE POLICY teammember_tenant_isolation ON "TeamMember"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY teammember_tenant_insert ON "TeamMember"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- Candidate table
ALTER TABLE "Candidate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY candidate_tenant_isolation ON "Candidate"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY candidate_tenant_insert ON "Candidate"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- CandidateStageHistory table
ALTER TABLE "CandidateStageHistory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY candidatestagehistory_tenant_isolation ON "CandidateStageHistory"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY candidatestagehistory_tenant_insert ON "CandidateStageHistory"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- Interview table
ALTER TABLE "Interview" ENABLE ROW LEVEL SECURITY;
CREATE POLICY interview_tenant_isolation ON "Interview"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY interview_tenant_insert ON "Interview"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- Feedback table
ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_tenant_isolation ON "Feedback"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY feedback_tenant_insert ON "Feedback"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- Integration table
ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;
CREATE POLICY integration_tenant_isolation ON "Integration"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY integration_tenant_insert ON "Integration"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- AuditLog table
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY auditlog_tenant_isolation ON "AuditLog"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY auditlog_tenant_insert ON "AuditLog"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- APIKey table
ALTER TABLE "APIKey" ENABLE ROW LEVEL SECURITY;
CREATE POLICY apikey_tenant_isolation ON "APIKey"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY apikey_tenant_insert ON "APIKey"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- FileObject table
ALTER TABLE "FileObject" ENABLE ROW LEVEL SECURITY;
CREATE POLICY fileobject_tenant_isolation ON "FileObject"
    USING ("tenantId" = get_current_tenant() OR "tenantId" IS NULL);
CREATE POLICY fileobject_tenant_insert ON "FileObject"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant() OR "tenantId" IS NULL);

-- MessageTemplate table
ALTER TABLE "MessageTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY messagetemplate_tenant_isolation ON "MessageTemplate"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY messagetemplate_tenant_insert ON "MessageTemplate"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- ChannelConfig table
ALTER TABLE "ChannelConfig" ENABLE ROW LEVEL SECURITY;
CREATE POLICY channelconfig_tenant_isolation ON "ChannelConfig"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY channelconfig_tenant_insert ON "ChannelConfig"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- AutomationRule table
ALTER TABLE "AutomationRule" ENABLE ROW LEVEL SECURITY;
CREATE POLICY automationrule_tenant_isolation ON "AutomationRule"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY automationrule_tenant_insert ON "AutomationRule"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- MessageLog table
ALTER TABLE "MessageLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY messagelog_tenant_isolation ON "MessageLog"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY messagelog_tenant_insert ON "MessageLog"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- ScheduledMessage table
ALTER TABLE "ScheduledMessage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY scheduledmessage_tenant_isolation ON "ScheduledMessage"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY scheduledmessage_tenant_insert ON "ScheduledMessage"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- WorkingHours table
ALTER TABLE "WorkingHours" ENABLE ROW LEVEL SECURITY;
CREATE POLICY workinghours_tenant_isolation ON "WorkingHours"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY workinghours_tenant_insert ON "WorkingHours"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- BusyBlock table
ALTER TABLE "BusyBlock" ENABLE ROW LEVEL SECURITY;
CREATE POLICY busyblock_tenant_isolation ON "BusyBlock"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY busyblock_tenant_insert ON "BusyBlock"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- SchedulingRule table
ALTER TABLE "SchedulingRule" ENABLE ROW LEVEL SECURITY;
CREATE POLICY schedulingrule_tenant_isolation ON "SchedulingRule"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY schedulingrule_tenant_insert ON "SchedulingRule"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- InterviewSlot table (if exists)
DO $$ BEGIN
    ALTER TABLE "InterviewSlot" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY interviewslot_tenant_isolation ON "InterviewSlot"
        USING ("tenantId" = get_current_tenant());
    CREATE POLICY interviewslot_tenant_insert ON "InterviewSlot"
        FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

-- HiringStage table
ALTER TABLE "HiringStage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY hiringstage_tenant_isolation ON "HiringStage"
    USING ("tenantId" = get_current_tenant());
CREATE POLICY hiringstage_tenant_insert ON "HiringStage"
    FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());

-- CandidateNote table (if exists)
DO $$ BEGIN
    ALTER TABLE "CandidateNote" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY candidatenote_tenant_isolation ON "CandidateNote"
        USING ("tenantId" = get_current_tenant());
    CREATE POLICY candidatenote_tenant_insert ON "CandidateNote"
        FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

-- RecycleBinItem table (if exists)
DO $$ BEGIN
    ALTER TABLE "RecycleBinItem" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY recyclebinitem_tenant_isolation ON "RecycleBinItem"
        USING ("tenantId" = get_current_tenant());
    CREATE POLICY recyclebinitem_tenant_insert ON "RecycleBinItem"
        FOR INSERT WITH CHECK ("tenantId" = get_current_tenant());
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

-- =====================================================
-- STEP 3: Create bypass role for admin operations
-- =====================================================

-- Create a role that can bypass RLS (for migrations, admin tasks)
DO $$ BEGIN
    CREATE ROLE talentsync_admin;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Grant bypass to admin role
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Candidate" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Interview" FORCE ROW LEVEL SECURITY;
-- Add more tables as needed...

-- =====================================================
-- STEP 4: Create helper for superadmin access
-- =====================================================

-- Superadmin policy (bypasses normal tenant isolation)
-- Only use for platform admin operations
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.is_superadmin', true) = 'true';
END;
$$ LANGUAGE plpgsql STABLE;

-- Update policies to allow superadmin bypass
DROP POLICY IF EXISTS user_tenant_isolation ON "User";
CREATE POLICY user_tenant_isolation ON "User"
    USING ("tenantId" = get_current_tenant() OR is_superadmin());

DROP POLICY IF EXISTS candidate_tenant_isolation ON "Candidate";
CREATE POLICY candidate_tenant_isolation ON "Candidate"
    USING ("tenantId" = get_current_tenant() OR is_superadmin());

DROP POLICY IF EXISTS interview_tenant_isolation ON "Interview";
CREATE POLICY interview_tenant_isolation ON "Interview"
    USING ("tenantId" = get_current_tenant() OR is_superadmin());

-- =====================================================
-- DONE: RLS is now enabled
-- =====================================================

-- To test:
-- SELECT set_current_tenant('your-tenant-id');
-- SELECT * FROM "User"; -- Should only show users from that tenant
