-- Add manual sector review columns to campaigns table

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS needs_manual_sector BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sector_confidence TEXT CHECK (sector_confidence IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS classification_method TEXT CHECK (classification_method IN ('brand_mapping', 'keyword_scoring', 'ai_snippet', 'manual', 'bank_campaign')),
ADD COLUMN IF NOT EXISTS is_bank_campaign BOOLEAN DEFAULT false;

-- Create index for manual review queries
CREATE INDEX IF NOT EXISTS idx_campaigns_manual_sector ON campaigns(needs_manual_sector) WHERE needs_manual_sector = true;

-- Create sector_keywords table
CREATE TABLE IF NOT EXISTS sector_keywords (
    id SERIAL PRIMARY KEY,
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    weight INTEGER DEFAULT 1 CHECK (weight >= 1 AND weight <= 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sector_id, keyword)
);

-- Create sector_keyword_suggestions table
CREATE TABLE IF NOT EXISTS sector_keyword_suggestions (
    id SERIAL PRIMARY KEY,
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    source_campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    suggested_by TEXT DEFAULT 'admin',
    confidence FLOAT DEFAULT 0.7,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by TEXT
);

-- Add sector_id to master_brands for brand-based classification
ALTER TABLE master_brands 
ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES sectors(id) ON DELETE SET NULL;

COMMENT ON COLUMN campaigns.needs_manual_sector IS 'Flag for campaigns requiring manual sector assignment';
COMMENT ON COLUMN campaigns.sector_confidence IS 'Confidence level of sector classification: high, medium, low';
COMMENT ON COLUMN campaigns.classification_method IS 'Method used for sector classification';
COMMENT ON COLUMN campaigns.is_bank_campaign IS 'Flag for bank-specific campaigns (avans, çekiliş, etc.)';
