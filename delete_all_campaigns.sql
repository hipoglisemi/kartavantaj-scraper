-- Delete all campaigns to start fresh
DELETE FROM campaigns;

-- Verify deletion
SELECT COUNT(*) as remaining_campaigns FROM campaigns;
