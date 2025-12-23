-- Check if there are any campaigns with "Busines" (typo) in card_name
SELECT DISTINCT card_name, COUNT(*) as count
FROM campaigns
WHERE card_name ILIKE '%busines%'
GROUP BY card_name
ORDER BY count DESC;
