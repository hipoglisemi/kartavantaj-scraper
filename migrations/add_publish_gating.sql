-- Migration: Add Publish Gating to Campaigns
-- Ensures only clean data is visible on public site

-- Add publish gating columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS publish_status TEXT NOT NULL DEFAULT 'processing';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS publish_updated_at TIMESTAMPTZ NULL;

-- Add constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_publish_status') THEN
        ALTER TABLE campaigns ADD CONSTRAINT check_publish_status 
            CHECK (publish_status IN ('processing', 'clean', 'needs_review'));
    END IF;
END $$;

-- Add index for public queries
CREATE INDEX IF NOT EXISTS idx_campaigns_publish_status ON campaigns(publish_status) WHERE publish_status = 'clean';
CREATE INDEX IF NOT EXISTS idx_campaigns_publish_updated ON campaigns(publish_updated_at DESC);

-- Comments
COMMENT ON COLUMN campaigns.publish_status IS 'Publish gating status: processing (new/being audited), clean (passed quality checks), needs_review (failed checks or AI uncertain)';
COMMENT ON COLUMN campaigns.publish_updated_at IS 'Last time publish_status was updated';

-- Set existing campaigns to 'clean' (assume they were already published)
UPDATE campaigns SET publish_status = 'clean', publish_updated_at = NOW() WHERE publish_status = 'processing';
