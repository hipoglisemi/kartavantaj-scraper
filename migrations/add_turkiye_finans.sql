-- Türkiye Finans Bankası Senkronizasyon ve FK Düzeltme

-- 1. master_banks tablosuna ekle (Foreign Key'in ana kaynağı burası)
INSERT INTO master_banks (id, name, slug, aliases, is_active, sort_order, created_at, updated_at)
VALUES (
    31,
    'Türkiye Finans',
    'turkiye-finans',
    ARRAY['Türkiye Finans', 'Türkiye Finans Katılım Bankası']::text[],
    true,
    20, -- Uygun bir sıralama
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE 
SET name = 'Türkiye Finans', aliases = ARRAY['Türkiye Finans', 'Türkiye Finans Katılım Bankası']::text[];

-- 2. banks tablosundaki slug'ı düzelt (trkiyefinans -> turkiye-finans)
UPDATE banks 
SET slug = 'turkiye-finans' 
WHERE name = 'Türkiye Finans' OR slug = 'trkiyefinans';

-- 3. bank_configs tablosunu kesinleştir
INSERT INTO bank_configs (bank_id, bank_name, cards, aliases)
VALUES (
    'turkiye-finans',
    'Türkiye Finans',
    '[{"id": "happy-card", "name": "Happy Card"}, {"id": "ala-card", "name": "Ala Card"}]'::jsonb,
    ARRAY['Türkiye Finans Katılım Bankası']::text[]
)
ON CONFLICT (bank_id) DO UPDATE 
SET cards = EXCLUDED.cards, aliases = EXCLUDED.aliases;

-- 4. Kontrol
SELECT 'master_banks' as tablom, name, slug FROM master_banks WHERE slug = 'turkiye-finans'
UNION ALL
SELECT 'banks' as tablom, name, slug FROM banks WHERE slug = 'turkiye-finans'
UNION ALL
SELECT 'bank_configs' as tablom, bank_name as name, bank_id as slug FROM bank_configs WHERE bank_id = 'turkiye-finans';

