-- Normalize all candidate stage values to UPPERCASE for consistency

-- Update all lowercase/mixed-case stages to UPPERCASE
UPDATE "Candidate"
SET stage = UPPER(stage)
WHERE stage IS NOT NULL AND stage != UPPER(stage);

-- Add a comment noting that stages should always be UPPERCASE
COMMENT ON COLUMN "Candidate"."stage" IS 'Candidate pipeline stage. Always stored in UPPERCASE (e.g., APPLIED, SCREENING, INTERVIEW, OFFER, REJECTED)';
