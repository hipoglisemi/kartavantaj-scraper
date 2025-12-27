-- Migration: Quality Audit System
-- Creates audit table and adds manual fix flag to campaigns

-- 1. Create campaign_quality_audits table
CREATE TABLE IF NOT EXISTS campaign_quality_audits (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT REFERENCES campaigns(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    issues TEXT[],
    diff JSONB,
    clean_text_snippet TEXT,
    source TEXT DEFAULT 'audit_script'
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quality_audits_campaign ON campaign_quality_audits(campaign_id);
CREATE INDEX IF NOT EXISTS idx_quality_audits_severity ON campaign_quality_audits(severity);
CREATE INDEX IF NOT EXISTS idx_quality_audits_created ON campaign_quality_audits(created_at DESC);

-- 3. Add needs_manual_fix flag to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS needs_manual_fix BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_campaigns_manual_fix ON campaigns(needs_manual_fix) WHERE needs_manual_fix = TRUE;

-- 4. Comments for documentation
COMMENT ON TABLE campaign_quality_audits IS 'Quality audit results comparing DB values vs deterministic extraction';
COMMENT ON COLUMN campaign_quality_audits.severity IS 'Issue severity: LOW, MEDIUM, or HIGH';
COMMENT ON COLUMN campaign_quality_audits.issues IS 'Array of issue type codes (e.g., date_year_mismatch, discount_missing_taksit)';
COMMENT ON COLUMN campaign_quality_audits.diff IS 'JSON object showing DB vs Expected values for each field';
COMMENT ON COLUMN campaign_quality_audits.clean_text_snippet IS 'First 500 characters of campaign text for quick reference';
COMMENT ON COLUMN campaigns.needs_manual_fix IS 'Flag set to true when HIGH severity audit issues are detected';
