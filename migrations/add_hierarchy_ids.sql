-- migrations/add_hierarchy_ids.sql
-- Add brand_id and sector_id columns to campaigns table for ID-based hierarchy

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES master_brands(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES master_sectors(id) ON DELETE SET NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_sector_id ON campaigns(sector_id);

-- Add comment
COMMENT ON COLUMN campaigns.brand_id IS 'Foreign key to master_brands table for brand deduplication';
COMMENT ON COLUMN campaigns.sector_id IS 'Foreign key to master_sectors table for sector categorization';
