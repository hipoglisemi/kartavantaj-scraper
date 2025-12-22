-- =====================================================
-- MASTER BANKS TABLE - Centralized Bank Management
-- =====================================================
-- This table serves as the single source of truth for all bank names
-- Both frontend and scraper will use this table

CREATE TABLE IF NOT EXISTS master_banks (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,           -- Official display name (e.g., "Vakıfbank")
    slug TEXT UNIQUE NOT NULL,           -- URL-friendly slug (e.g., "vakifbank")
    aliases TEXT[],                      -- Alternative names (e.g., ["Vakifbank", "VakıfBank"])
    logo_url TEXT,                       -- Bank logo URL
    is_active BOOLEAN DEFAULT true,      -- Active/inactive status
    sort_order INTEGER DEFAULT 0,        -- Display order in UI
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial banks with aliases
INSERT INTO master_banks (name, slug, aliases, sort_order) VALUES
    ('Garanti BBVA', 'garanti-bbva', ARRAY['Garanti', 'Garanti BBVA', 'BBVA'], 1),
    ('Akbank', 'akbank', ARRAY['Akbank'], 2),
    ('İş Bankası', 'is-bankasi', ARRAY['İş Bankası', 'Is Bankasi', 'Isbank'], 3),
    ('Yapı Kredi', 'yapi-kredi', ARRAY['Yapı Kredi', 'Yapi Kredi', 'YKB'], 4),
    ('Ziraat Bankası', 'ziraat-bankasi', ARRAY['Ziraat', 'Ziraat Bankası', 'Ziraat Bankasi'], 5),
    ('Halkbank', 'halkbank', ARRAY['Halkbank', 'Halk Bankası'], 6),
    ('Vakıfbank', 'vakifbank', ARRAY['Vakıfbank', 'Vakifbank', 'VakıfBank'], 7)
ON CONFLICT (name) DO UPDATE SET
    aliases = EXCLUDED.aliases,
    updated_at = NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_master_banks_name ON master_banks(name);
CREATE INDEX IF NOT EXISTS idx_master_banks_slug ON master_banks(slug);
CREATE INDEX IF NOT EXISTS idx_master_banks_active ON master_banks(is_active);

-- Create function to match bank name (including aliases)
CREATE OR REPLACE FUNCTION match_bank_name(input_name TEXT)
RETURNS TEXT AS $$
DECLARE
    matched_bank TEXT;
BEGIN
    -- Try exact match first
    SELECT name INTO matched_bank
    FROM master_banks
    WHERE name = input_name
    LIMIT 1;
    
    IF matched_bank IS NOT NULL THEN
        RETURN matched_bank;
    END IF;
    
    -- Try case-insensitive match
    SELECT name INTO matched_bank
    FROM master_banks
    WHERE LOWER(name) = LOWER(input_name)
    LIMIT 1;
    
    IF matched_bank IS NOT NULL THEN
        RETURN matched_bank;
    END IF;
    
    -- Try aliases
    SELECT name INTO matched_bank
    FROM master_banks
    WHERE input_name = ANY(aliases)
    LIMIT 1;
    
    IF matched_bank IS NOT NULL THEN
        RETURN matched_bank;
    END IF;
    
    -- Try case-insensitive aliases
    SELECT name INTO matched_bank
    FROM master_banks
    WHERE LOWER(input_name) = ANY(SELECT LOWER(unnest(aliases)))
    LIMIT 1;
    
    RETURN matched_bank;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your RLS policies)
-- ALTER TABLE master_banks ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read access" ON master_banks FOR SELECT USING (true);
-- CREATE POLICY "Admin write access" ON master_banks FOR ALL USING (auth.role() = 'authenticated');
