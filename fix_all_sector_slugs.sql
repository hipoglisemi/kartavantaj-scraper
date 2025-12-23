-- Fix all campaigns with old/wrong sector slugs

-- English slugs to Turkish
UPDATE campaigns SET sector_slug = 'dijital-platform' WHERE sector_slug = 'digital-platform';
UPDATE campaigns SET sector_slug = 'e-ticaret' WHERE sector_slug = 'e-commerce';
UPDATE campaigns SET sector_slug = 'elektronik' WHERE sector_slug = 'electronics';
UPDATE campaigns SET sector_slug = 'mobilya-dekorasyon' WHERE sector_slug = 'furniture';
UPDATE campaigns SET sector_slug = 'ulasim' WHERE sector_slug = 'transportation';
UPDATE campaigns SET sector_slug = 'turizm-konaklama' WHERE sector_slug = 'travel';

-- Old Turkish slugs to new ones
UPDATE campaigns SET sector_slug = 'giyim-aksesuar' WHERE sector_slug = 'giyim';
UPDATE campaigns SET sector_slug = 'kozmetik-saglik' WHERE sector_slug = 'kozmetik';
UPDATE campaigns SET sector_slug = 'market-gida' WHERE sector_slug = 'market';
UPDATE campaigns SET sector_slug = 'mobilya-dekorasyon' WHERE sector_slug = 'mobilya';
UPDATE campaigns SET sector_slug = 'kozmetik-saglik' WHERE sector_slug = 'saglik';
UPDATE campaigns SET sector_slug = 'restoran-kafe' WHERE sector_slug = 'yemek';
UPDATE campaigns SET sector_slug = 'mobilya-dekorasyon' WHERE sector_slug = 'mobilya-ve-dekorasyon';

-- Hobi-ve-oyuncak doesn't have a matching sector, move to "diger"
UPDATE campaigns SET sector_slug = 'diger' WHERE sector_slug = 'hobi-ve-oyuncak';

-- Verify: Check if any invalid slugs remain
SELECT DISTINCT sector_slug 
FROM campaigns 
WHERE sector_slug NOT IN (SELECT slug FROM master_sectors)
ORDER BY sector_slug;
