-- Run this query in Supabase SQL Editor to check all sectors and their keywords
-- Keywords are stored as JSONB, not array

SELECT 
    name,
    slug,
    description,
    keywords,
    jsonb_array_length(keywords) as keyword_count
FROM master_sectors
ORDER BY name;

-- Additional query to find specific problematic sectors
SELECT 
    name,
    slug,
    keywords
FROM master_sectors
WHERE 
    name ILIKE '%yaşam%' 
    OR slug = 'yasam'
    OR slug = 'yasam-tarzi'
    OR name ILIKE '%turizm%'
    OR name ILIKE '%teknoloji%';
