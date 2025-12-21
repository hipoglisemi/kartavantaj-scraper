-- Migration: Add ai_parsing_incomplete column
-- Date: 2025-12-21
-- Description: Adds ai_parsing_incomplete column that scraper uses to flag incomplete AI parsing

-- Add missing column
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS ai_parsing_incomplete BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN campaigns.ai_parsing_incomplete IS 'Indicates if AI parsing was incomplete for this campaign';

-- Verify column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'ai_parsing_incomplete'
    ) THEN
        RAISE NOTICE '✅ Migration completed successfully';
    ELSE
        RAISE EXCEPTION '❌ Migration failed - column not found';
    END IF;
END $$;
