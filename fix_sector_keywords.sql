-- Fix sector keywords to prevent misclassification

-- 1. Add missing keywords to "Turizm & Konaklama"
UPDATE master_sectors
SET keywords = keywords || '["yurt dışı", "duty free", "seyahat", "yurtdışı"]'::jsonb
WHERE slug = 'turizm-konaklama';

-- 2. Check if there's a "Yaşam" sector that shouldn't exist
-- First, let's see what campaigns are using "yasam" slug
SELECT COUNT(*) as campaign_count, sector_slug
FROM campaigns
WHERE sector_slug ILIKE '%yasam%'
GROUP BY sector_slug
ORDER BY campaign_count DESC;

-- 3. If campaigns are using a non-existent "yasam" sector, 
-- we need to reclassify them to appropriate sectors
-- This will be done via the "Belli Belirsizleri Düzelt" button in admin panel

-- Verify the changes
SELECT name, slug, keywords
FROM master_sectors
WHERE slug = 'turizm-konaklama';
