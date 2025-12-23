-- Check if the image fix worked - look for campaigns with correct images
SELECT 
    id,
    title,
    image,
    CASE 
        WHEN image LIKE '%logo.svg%' THEN '❌ LOGO'
        WHEN image LIKE '%kampanyalar%' THEN '✅ CAMPAIGN IMAGE'
        WHEN image LIKE '%teaser.coreimg%' THEN '✅ CAMPAIGN IMAGE'
        ELSE '⚠️ OTHER'
    END as image_type,
    created_at
FROM campaigns
WHERE 
    card_name = 'Paraf'
    AND title IN (
        'Seçili E-Ticaret Alışverişlerinize 10.000 TL''ye varan ParafPara',
        'Seçili E-Ticaret Taksitli Alışverişlerinize 6.000 TL''ye varan ParafPara'
    )
ORDER BY created_at DESC;
