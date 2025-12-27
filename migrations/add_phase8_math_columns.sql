-- Migration: Add Phase 8 Math Columns to campaigns table
-- Date: 2025-12-27
-- Description: Adds columns for advanced math extraction, conflict detection and AI referee.

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS max_discount NUMERIC,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS math_flags TEXT[],
ADD COLUMN IF NOT EXISTS required_spend_for_max_benefit NUMERIC,
ADD COLUMN IF NOT EXISTS ai_suggested_math JSONB,
ADD COLUMN IF NOT EXISTS ai_suggested_valid_until DATE;

-- Add comments for documentation
COMMENT ON COLUMN campaigns.max_discount IS 'Maximum reward limit (cap) per customer/campaign';
COMMENT ON COLUMN campaigns.discount_percentage IS 'Percentage based reward value (e.g. 15 for %15)';
COMMENT ON COLUMN campaigns.math_flags IS 'Array of conflict/issue flags detected during math extraction';
COMMENT ON COLUMN campaigns.required_spend_for_max_benefit IS 'Total spend required to reach the max_discount cap';
COMMENT ON COLUMN campaigns.ai_suggested_math IS 'Math suggestions from AI referee (for suggest-only merge policy)';
COMMENT ON COLUMN campaigns.ai_suggested_valid_until IS 'Valid until date suggested by AI referee';

-- Create index for flags to allow finding problematic campaigns fast
CREATE INDEX IF NOT EXISTS idx_campaigns_math_flags ON campaigns USING GIN (math_flags);
