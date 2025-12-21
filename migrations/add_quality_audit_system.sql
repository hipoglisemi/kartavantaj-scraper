-- Campaign Quality Audit System
-- Add audit logging table and quality tracking columns

-- Create audit log table
CREATE TABLE IF NOT EXISTS campaign_audit_log (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT REFERENCES campaigns(id) ON DELETE CASCADE,
  audit_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  auto_fixed BOOLEAN DEFAULT false,
  confidence FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add quality tracking columns to campaigns
ALTER TABLE campaigns 
  ADD COLUMN IF NOT EXISTS auto_corrected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS quality_score FLOAT;

-- Create index for faster audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_campaign_id ON campaign_audit_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON campaign_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_auto_corrected ON campaigns(auto_corrected);
CREATE INDEX IF NOT EXISTS idx_campaigns_quality_score ON campaigns(quality_score);

-- Add comments for documentation
COMMENT ON TABLE campaign_audit_log IS 'Tracks all automatic corrections and validations performed on campaigns';
COMMENT ON COLUMN campaigns.auto_corrected IS 'Indicates if this campaign has been automatically corrected by the quality auditor';
COMMENT ON COLUMN campaigns.quality_score IS 'Quality score from 0-100 based on completeness and accuracy';
