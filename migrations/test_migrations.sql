-- Test script to verify migrations
-- Run this in Supabase SQL Editor to check if migrations were applied

-- Check if AI auto-fix columns exist in campaign_quality_audits
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'campaign_quality_audits'
  AND column_name IN (
    'ai_status', 'ai_confidence', 'ai_patch', 'ai_notes', 'ai_model', 'ai_applied_at',
    'status', 'reviewed_by', 'reviewed_at', 'resolution_notes', 'overrides'
  )
ORDER BY column_name;

-- Check if publish gating columns exist in campaigns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'campaigns'
  AND column_name IN ('publish_status', 'publish_updated_at')
ORDER BY column_name;

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('campaign_quality_audits', 'campaigns')
  AND constraint_name IN ('check_ai_status', 'check_status', 'check_publish_status')
ORDER BY constraint_name;

-- Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('campaign_quality_audits', 'campaigns')
  AND indexname LIKE '%ai_%' OR indexname LIKE '%publish_%'
ORDER BY tablename, indexname;

-- Sample data check
SELECT 
    'campaign_quality_audits' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN ai_status IS NOT NULL THEN 1 END) as has_ai_status,
    COUNT(CASE WHEN ai_confidence IS NOT NULL THEN 1 END) as has_ai_confidence
FROM campaign_quality_audits

UNION ALL

SELECT 
    'campaigns' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN publish_status IS NOT NULL THEN 1 END) as has_publish_status,
    COUNT(CASE WHEN publish_updated_at IS NOT NULL THEN 1 END) as has_publish_updated_at
FROM campaigns;
