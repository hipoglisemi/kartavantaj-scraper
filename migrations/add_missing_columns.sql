-- Migration: Add missing columns to campaigns table
-- Date: 2025-12-21
-- Description: Adds is_active and reference_url columns required by all scrapers

-- Add missing columns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reference_url TEXT;

-- Create unique index on reference_url for upsert operations
-- This allows scrapers to use: .upsert(data, { onConflict: 'reference_url' })
CREATE UNIQUE INDEX IF NOT EXISTS campaigns_reference_url_key 
ON campaigns(reference_url);

-- Add comments for documentation
COMMENT ON COLUMN campaigns.is_active IS 'Indicates if the campaign is currently active';
COMMENT ON COLUMN campaigns.reference_url IS 'Source URL of the campaign, used as unique identifier for upserts';

-- Verify columns were added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name IN ('is_active', 'reference_url')
    ) THEN
        RAISE NOTICE '✅ Migration completed successfully';
    ELSE
        RAISE EXCEPTION '❌ Migration failed - columns not found';
    END IF;
END $$;
