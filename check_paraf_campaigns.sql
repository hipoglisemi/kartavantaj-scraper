-- Check the last 5 Paraf campaigns to verify data quality
SELECT 
    id,
    title,
    description,
    earning,
    min_spend,
    valid_until,
    sector_slug,
    brand,
    image,
    LENGTH(description) as desc_length,
    LENGTH(image) as image_url_length
FROM campaigns
WHERE card_name = 'Paraf'
ORDER BY created_at DESC
LIMIT 5;
