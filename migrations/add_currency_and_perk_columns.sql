-- Migration: Add Multi-Currency, Perk and Reward Type columns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS min_spend_currency TEXT DEFAULT 'TRY',
ADD COLUMN IF NOT EXISTS earning_currency TEXT DEFAULT 'TRY',
ADD COLUMN IF NOT EXISTS max_discount_currency TEXT DEFAULT 'TRY',
ADD COLUMN IF NOT EXISTS required_spend_currency TEXT DEFAULT 'TRY',
ADD COLUMN IF NOT EXISTS has_mixed_currency BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS perk_text TEXT,
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS reward_type TEXT, -- perk, points, installment, mixed, discount_pct, cashback, unknown
ADD COLUMN IF NOT EXISTS needs_manual_reward BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN campaigns.min_spend_currency IS 'Currency for minimum spend amount (TRY, USD, EUR, GBP)';
COMMENT ON COLUMN campaigns.earning_currency IS 'Currency for reward/earning amount';
COMMENT ON COLUMN campaigns.has_mixed_currency IS 'Flag set when multiple currencies are detected in the same campaign';
COMMENT ON COLUMN campaigns.perk_text IS 'Non-numeric reward description (e.g. Free Parking, Voucher)';
COMMENT ON COLUMN campaigns.reward_type IS 'Normalized reward classification for UI styling and filtering';

-- Index for reward_type to speed up filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_reward_type ON campaigns(reward_type);
