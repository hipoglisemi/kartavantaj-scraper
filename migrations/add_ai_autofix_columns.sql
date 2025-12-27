-- Migration: Add AI Auto-Fix System Columns
-- Adds AI status tracking and human review workflow columns to campaign_quality_audits

-- AI Auto-Fix Tracking Columns
ALTER TABLE campaign_quality_audits ADD COLUMN IF NOT EXISTS ai_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE campaign_quality_audits ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC NULL;
ALTER TABLE campaign_quality_audits ADD COLUMN IF NOT EXISTS ai_patch JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE campaign_quality_audits ADD COLUMN IF NOT EXISTS ai_notes TEXT NULL;
ALTER TABLE campaign_quality_audits ADD COLUMN IF NOT EXISTS ai_model TEXT NULL;
ALTER TABLE campaign_quality_audits ADD COLUMN IF NOT EXISTS ai_applied_at TIMESTAMPTZ NULL;

-- Human Review Tracking Columns
ALTER TABLE campaign_quality_audits ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE campaign_quality_audits ADD COLUMN IF NOT EXISTS reviewed_by TEXT NULL;
ALTER TABLE campaign_quality_audits ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL;
ALTER TABLE campaign_quality_audits ADD COLUMN IF NOT EXISTS resolution_notes TEXT NULL;
ALTER TABLE campaign_quality_audits ADD COLUMN IF NOT EXISTS overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add Constraints (using DO block for conditional creation)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_ai_status') THEN
        ALTER TABLE campaign_quality_audits ADD CONSTRAINT check_ai_status 
            CHECK (ai_status IN ('pending', 'auto_applied', 'needs_review', 'failed'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_status') THEN
        ALTER TABLE campaign_quality_audits ADD CONSTRAINT check_status 
            CHECK (status IN ('open', 'fixed', 'ignored', 'needs_rescrape'));
    END IF;
END $$;

-- Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_audits_ai_status ON campaign_quality_audits(ai_status);
CREATE INDEX IF NOT EXISTS idx_audits_status ON campaign_quality_audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_severity_status ON campaign_quality_audits(severity, ai_status);
CREATE INDEX IF NOT EXISTS idx_audits_campaign_status ON campaign_quality_audits(campaign_id, status);

-- Comments for Documentation
COMMENT ON COLUMN campaign_quality_audits.ai_status IS 'AI fix status: pending (not processed), auto_applied (high confidence), needs_review (medium confidence), failed (low confidence or error)';
COMMENT ON COLUMN campaign_quality_audits.ai_confidence IS 'AI confidence score 0.0-1.0. >=0.80 auto-applies, 0.55-0.79 needs review, <0.55 fails';
COMMENT ON COLUMN campaign_quality_audits.ai_patch IS 'JSON object with field-level patches suggested by AI';
COMMENT ON COLUMN campaign_quality_audits.ai_notes IS 'AI explanation of the fix and reasoning';
COMMENT ON COLUMN campaign_quality_audits.ai_model IS 'AI model used for fix generation (e.g., gemini-2.0-flash)';
COMMENT ON COLUMN campaign_quality_audits.ai_applied_at IS 'Timestamp when AI patch was automatically applied';
COMMENT ON COLUMN campaign_quality_audits.status IS 'Human review status: open (pending review), fixed (resolved), ignored (rejected), needs_rescrape (requires re-scraping)';
COMMENT ON COLUMN campaign_quality_audits.reviewed_by IS 'User who reviewed and approved/rejected the fix';
COMMENT ON COLUMN campaign_quality_audits.reviewed_at IS 'Timestamp of human review';
COMMENT ON COLUMN campaign_quality_audits.resolution_notes IS 'Human notes about the resolution';
COMMENT ON COLUMN campaign_quality_audits.overrides IS 'JSON object with manual overrides applied by human reviewer';
