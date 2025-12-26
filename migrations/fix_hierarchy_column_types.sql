-- migrations/fix_hierarchy_column_types.sql
-- Change bank_id and card_id from INTEGER to TEXT to match bank_configs

-- 1. Drop existing columns if they have wrong type
ALTER TABLE campaigns
DROP COLUMN IF EXISTS bank_id,
DROP COLUMN IF EXISTS card_id;

-- 2. Re-add with correct TEXT type
ALTER TABLE campaigns
ADD COLUMN bank_id TEXT,
ADD COLUMN card_id TEXT;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_bank_id ON campaigns(bank_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_card_id ON campaigns(card_id);

-- 4. Add comments
COMMENT ON COLUMN campaigns.bank_id IS 'Bank identifier from bank_configs table';
COMMENT ON COLUMN campaigns.card_id IS 'Card identifier from bank_configs.cards array';
