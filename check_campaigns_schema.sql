-- Check campaigns table schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'campaigns'
  AND column_name IN ('bank_id', 'card_id', 'brand_id', 'sector_id')
ORDER BY column_name;
