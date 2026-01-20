-- RLS Bypass: Insert Operatör into master_banks
-- Run this in Supabase Dashboard > SQL Editor

INSERT INTO master_banks (name, slug)
VALUES ('Operatör', 'operator')
ON CONFLICT (slug) DO NOTHING;

-- Verification
SELECT * FROM master_banks WHERE slug = 'operator';
