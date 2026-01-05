
-- Migration to add missing columns detected during Akbank AI fix
-- Issues: Code expects ai_processed, keywords, updated_at which are missing.

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS ai_processed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

-- Add comment explaining why
COMMENT ON COLUMN campaigns.ai_processed IS 'Flag to indicate if AI processing/parsing has been completed. Added manually locally.';
