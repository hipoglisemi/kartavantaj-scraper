-- Rename "Axess Business" to just "Business"
UPDATE campaigns
SET card_name = 'Business'
WHERE card_name = 'Axess Business';

-- Verify the change
SELECT card_name, COUNT(*) as count
FROM campaigns
WHERE card_name = 'Business'
GROUP BY card_name;
