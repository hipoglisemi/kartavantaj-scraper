-- Fix campaigns with wrong sectors

-- 1. Fix campaigns using non-existent "seyahat" slug
UPDATE campaigns
SET sector_slug = 'turizm-konaklama'
WHERE sector_slug = 'seyahat';

-- 2. Fix "yurt dışı" campaigns that are in "diger" 
-- (these should be in turizm-konaklama now that we added the keywords)
UPDATE campaigns
SET sector_slug = 'turizm-konaklama'
WHERE 
    sector_slug = 'diger' 
    AND (
        title ILIKE '%yurt dışı%' 
        OR title ILIKE '%yurtdışı%'
        OR title ILIKE '%duty free%'
        OR description ILIKE '%yurt dışı%'
        OR description ILIKE '%yurtdışı%'
    );

-- 3. Fix "yemek" sector for international restaurant campaigns
UPDATE campaigns
SET sector_slug = 'restoran-kafe'
WHERE 
    sector_slug = 'yemek'
    AND (title ILIKE '%restoran%' OR title ILIKE '%cafe%' OR title ILIKE '%kafe%');

-- Verify changes
SELECT COUNT(*) as fixed_count, sector_slug
FROM campaigns
WHERE 
    title ILIKE '%yurt dışı%' 
    OR title ILIKE '%yurtdışı%'
GROUP BY sector_slug;
