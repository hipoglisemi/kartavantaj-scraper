-- Campaign Blacklist Table
-- Purpose: Prevent re-scraping of manually deleted/rejected campaigns

CREATE TABLE IF NOT EXISTS campaign_blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT UNIQUE NOT NULL,
  reason TEXT,
  added_by TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup during scraping
CREATE INDEX IF NOT EXISTS idx_blacklist_url ON campaign_blacklist(url);

-- Comments
COMMENT ON TABLE campaign_blacklist IS 'URLs that should never be scraped again';
COMMENT ON COLUMN campaign_blacklist.url IS 'Campaign URL (unique)';
COMMENT ON COLUMN campaign_blacklist.reason IS 'Why it was blacklisted (e.g., "Category page", "Invalid link")';
COMMENT ON COLUMN campaign_blacklist.added_by IS 'Who added it: manual, auto, admin';
COMMENT ON COLUMN campaign_blacklist.created_at IS 'When it was blacklisted';
