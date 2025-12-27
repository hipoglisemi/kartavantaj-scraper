-- Verification queries for database migrations
-- Run these in Supabase SQL Editor

-- 1. Check sector_keywords count
SELECT COUNT(*) as keyword_count FROM sector_keywords;

-- 2. Check brand-sector mappings
SELECT COUNT(*) as mapped_brands 
FROM master_brands 
WHERE sector_id IS NOT NULL;

-- 3. Check new columns in campaigns
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('needs_manual_sector', 'sector_confidence', 'classification_method', 'is_bank_campaign')
ORDER BY column_name;

-- 4. Sample campaigns with new fields
SELECT 
    id,
    title,
    sector_slug,
    classification_method,
    sector_confidence,
    is_bank_campaign,
    needs_manual_sector
FROM campaigns
LIMIT 5;

-- 5. Sample brand-sector mappings
SELECT 
    mb.name as brand_name,
    s.name as sector_name,
    s.slug as sector_slug
FROM master_brands mb
JOIN sectors s ON mb.sector_id = s.id
LIMIT 10;

-- 6. Sample keywords by sector
SELECT 
    s.name as sector_name,
    COUNT(sk.id) as keyword_count,
    STRING_AGG(sk.keyword, ', ' ORDER BY sk.weight DESC) as sample_keywords
FROM sectors s
LEFT JOIN sector_keywords sk ON s.id = sk.sector_id AND sk.is_active = true
GROUP BY s.id, s.name
ORDER BY keyword_count DESC
LIMIT 5;
