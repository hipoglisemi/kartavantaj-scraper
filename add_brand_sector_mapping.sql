-- Phase 2: Brand-Based Sector Classification
-- Add sector_id to master_brands for direct brand→sector mapping

-- 1. Add sector_id column
ALTER TABLE master_brands 
ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES sectors(id) ON DELETE SET NULL;

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_master_brands_sector ON master_brands(sector_id);

-- 3. Populate brand→sector mappings
-- Note: Run this after sectors are populated in database

-- Elektronik
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1)
WHERE LOWER(name) IN ('teknosa', 'vatan bilgisayar', 'media markt', 'apple', 'samsung', 'arçelik', 'beko', 'vestel', 'profilo', 'altus', 'grundig', 'bosch');

-- Market & Gıda
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'market-gida' LIMIT 1)
WHERE LOWER(name) IN ('migros', 'carrefoursa', 'şok market', 'a101', 'bim', 'file', 'macrocenter', 'carrefour', 'metro', 'kipa', 'real');

-- Akaryakıt
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'akaryakit' LIMIT 1)
WHERE LOWER(name) IN ('shell', 'opet', 'bp', 'petrol ofisi', 'totalenergies', 'po', 'aytemiz', 'moil', 'lukoil', 'alpet');

-- Giyim & Aksesuar
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1)
WHERE LOWER(name) IN ('boyner', 'zara', 'h&m', 'mango', 'lcw', 'koton', 'defacto', 'collezione', 'kiğılı', 'network', 'ipekyol', 'vakko', 'beymen');

-- Restoran & Kafe
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'restoran-kafe' LIMIT 1)
WHERE LOWER(name) IN ('starbucks', 'burger king', 'mcdonalds', 'kfc', 'popeyes', 'subway', 'dominos', 'pizza hut');

-- Mobilya & Dekorasyon
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'mobilya-dekorasyon' LIMIT 1)
WHERE LOWER(name) IN ('ikea', 'koçtaş', 'bauhaus', 'english home', 'madame coco', 'karaca');

-- Kozmetik & Sağlık
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1)
WHERE LOWER(name) IN ('gratis', 'watsons', 'rossmann', 'sephora', 'mac', 'loreal', 'nivea');

-- E-Ticaret
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'e-ticaret' LIMIT 1)
WHERE LOWER(name) IN ('trendyol', 'hepsiburada', 'amazon', 'n11', 'pazarama', 'çiçeksepeti', 'gittigidiyor', 'morhipo');

-- Ulaşım
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1)
WHERE LOWER(name) IN ('thy', 'pegasus', 'türk hava yolları', 'avis', 'budget', 'europcar', 'martı', 'bitaksi', 'uber');

-- Dijital Platform
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'dijital-platform' LIMIT 1)
WHERE LOWER(name) IN ('netflix', 'spotify', 'youtube premium', 'exxen', 'disney+', 'steam', 'playstation', 'xbox');

-- Kültür & Sanat
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'kultur-sanat' LIMIT 1)
WHERE LOWER(name) IN ('biletix', 'sinema', 'cinemaximum', 'cinemapink', 'd&r', 'pandora');

-- Turizm & Konaklama
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'turizm-konaklama' LIMIT 1)
WHERE LOWER(name) IN ('jolly tur', 'etstur', 'setur', 'tatilbudur', 'tatilsepeti', 'booking', 'hotels.com', 'airbnb');

-- Otomotiv
UPDATE master_brands SET sector_id = (SELECT id FROM sectors WHERE slug = 'otomotiv' LIMIT 1)
WHERE LOWER(name) IN ('bosch car service', 'bridgestone', 'michelin', 'pirelli', 'goodyear', 'lassa');

COMMENT ON COLUMN master_brands.sector_id IS 'Direct brand to sector mapping for AI-free classification';

-- 4. Query to check mappings
SELECT 
    mb.name as brand_name,
    s.name as sector_name,
    s.slug as sector_slug
FROM master_brands mb
LEFT JOIN sectors s ON mb.sector_id = s.id
WHERE mb.sector_id IS NOT NULL
ORDER BY s.name, mb.name;
