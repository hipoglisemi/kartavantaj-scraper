-- Migration: Change numeric columns to NUMERIC type
-- Date: 2025-12-21
-- Description: Changes columns that may contain decimal values from INTEGER to NUMERIC to prevent "invalid input syntax for type integer" errors.

ALTER TABLE campaigns 
ALTER COLUMN min_spend TYPE NUMERIC USING min_spend::NUMERIC,
ALTER COLUMN max_discount TYPE NUMERIC USING max_discount::NUMERIC,
ALTER COLUMN discount_percentage TYPE NUMERIC USING discount_percentage::NUMERIC;

-- Ensure earning is TEXT as it often contains non-numeric text like "500 TL Puan"
-- It likely is already TEXT, but ensuring it here or documenting it.
-- ALTER TABLE campaigns ALTER COLUMN earning TYPE TEXT;
