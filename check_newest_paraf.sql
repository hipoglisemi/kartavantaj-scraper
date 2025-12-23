-- Check the NEWEST 5 Paraf campaigns (created in last hour)
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
    created_at,
    LENGTH(description) as desc_length
FROM campaigns
WHERE 
    card_name = 'Paraf'
    AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;
