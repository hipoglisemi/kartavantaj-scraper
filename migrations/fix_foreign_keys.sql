-- migrations/fix_foreign_keys.sql
-- Establishes missing foreign key relationships required for frontend joins

-- 1. Ensure master_banks.slug has a unique constraint
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'master_banks_slug_key') THEN
        ALTER TABLE master_banks ADD CONSTRAINT master_banks_slug_key UNIQUE (slug);
    END IF;
END $$;

-- 2. Ensure cards.slug has a unique constraint
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cards_slug_key') THEN
        ALTER TABLE cards ADD CONSTRAINT cards_slug_key UNIQUE (slug);
    END IF;
END $$;

-- 3. Add Foreign Key for bank_id in campaigns table
ALTER TABLE campaigns
DROP CONSTRAINT IF EXISTS fk_campaigns_bank_id;

ALTER TABLE campaigns
ADD CONSTRAINT fk_campaigns_bank_id
FOREIGN KEY (bank_id) 
REFERENCES master_banks(slug) 
ON DELETE SET NULL;

-- 4. Add Foreign Key for card_id in campaigns table
ALTER TABLE campaigns
DROP CONSTRAINT IF EXISTS fk_campaigns_card_id;

ALTER TABLE campaigns
ADD CONSTRAINT fk_campaigns_card_id
FOREIGN KEY (card_id) 
REFERENCES cards(slug) 
ON DELETE SET NULL;

-- 5. Add comments describing the relations
COMMENT ON CONSTRAINT fk_campaigns_bank_id ON campaigns IS 'Allows PostgREST to join campaigns with master_banks using the bank_id (slug) column';
COMMENT ON CONSTRAINT fk_campaigns_card_id ON campaigns IS 'Allows PostgREST to join campaigns with cards using the card_id (slug) column';
