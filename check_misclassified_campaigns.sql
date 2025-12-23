-- Check specific campaigns that appear to have "Yaşam" sector
-- Let's look at campaigns with titles containing "crystal" or "yurt dışı"

SELECT 
    id,
    title,
    sector_slug,
    brand,
    description
FROM campaigns
WHERE 
    title ILIKE '%crystal%'
    OR title ILIKE '%yurt dışı%'
    OR title ILIKE '%yurtdışı%'
ORDER BY created_at DESC
LIMIT 10;
