-- Create master_banks table for centralized bank name management
CREATE TABLE IF NOT EXISTS master_banks (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert all banks
INSERT INTO master_banks (name, slug, display_name) VALUES
    ('Garanti BBVA', 'garanti-bbva', 'Garanti BBVA'),
    ('Akbank', 'akbank', 'Akbank'),
    ('İş Bankası', 'is-bankasi', 'İş Bankası'),
    ('Yapı Kredi', 'yapi-kredi', 'Yapı Kredi'),
    ('Ziraat Bankası', 'ziraat-bankasi', 'Ziraat Bankası'),
    ('Halkbank', 'halkbank', 'Halkbank'),
    ('Vakıfbank', 'vakifbank', 'Vakıfbank')
ON CONFLICT (name) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_master_banks_name ON master_banks(name);
CREATE INDEX IF NOT EXISTS idx_master_banks_slug ON master_banks(slug);
