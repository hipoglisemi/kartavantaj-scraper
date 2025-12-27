-- Migration: Add math audit and suggestion columns to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ai_suggested_math JSONB;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ai_suggested_valid_until TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS math_method TEXT DEFAULT 'deterministic';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS needs_manual_math BOOLEAN DEFAULT false;

COMMENT ON COLUMN campaigns.ai_suggested_math IS 'JSON containing math details extracted by AI (Suggest-Only)';
COMMENT ON COLUMN campaigns.ai_suggested_valid_until IS 'Campaign end date suggested by AI Date Referee';
COMMENT ON COLUMN campaigns.math_method IS 'Method used for mathematical extraction (deterministic, ai_applied, manual_override)';
COMMENT ON COLUMN campaigns.needs_manual_math IS 'Flag set when deterministic and AI math results conflict';
