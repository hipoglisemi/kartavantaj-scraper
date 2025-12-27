-- Audit Results Analysis
SELECT 
    'Total Campaigns Analyzed' as metric,
    COUNT(DISTINCT c.id)::text as value
FROM campaigns c
WHERE c.id IN (SELECT id FROM campaigns ORDER BY created_at DESC LIMIT 121)

UNION ALL

SELECT 
    'Campaigns with Issues',
    COUNT(*)::text
FROM campaign_quality_audits

UNION ALL

SELECT 
    'HIGH Severity',
    COUNT(*)::text
FROM campaign_quality_audits
WHERE severity = 'HIGH'

UNION ALL

SELECT 
    'MEDIUM Severity',
    COUNT(*)::text
FROM campaign_quality_audits
WHERE severity = 'MEDIUM'

UNION ALL

SELECT 
    'LOW Severity',
    COUNT(*)::text
FROM campaign_quality_audits
WHERE severity = 'LOW'

UNION ALL

SELECT 
    'needs_manual_fix Count',
    COUNT(*)::text
FROM campaigns
WHERE needs_manual_fix = true;

-- Top issue types
SELECT 
    unnest(issues) as issue_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM campaign_quality_audits), 1) as percentage,
    ARRAY_AGG(campaign_id ORDER BY campaign_id LIMIT 3) as example_campaign_ids
FROM campaign_quality_audits
GROUP BY issue_type
ORDER BY count DESC
LIMIT 15;
