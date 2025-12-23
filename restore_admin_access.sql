-- RLS Policy Restoration for Admin Panel
-- This script restores write access to the main tables used by the Admin Panel.
-- It allows 'anon' (anonymous) role to Insert/Update/Delete.
-- CAUTION: This means anyone with your API Key can modify data. 
-- Ensure your API Key is not leaked or switch to Authenticated RLS later.

-- 1. CAMPAIGNS TABLE
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access" ON campaigns;
DROP POLICY IF EXISTS "Public Insert Access" ON campaigns;
DROP POLICY IF EXISTS "Public Update Access" ON campaigns;
DROP POLICY IF EXISTS "Public Delete Access" ON campaigns;

DROP POLICY IF EXISTS "Enable read access for all users" ON campaigns;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON campaigns;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON campaigns;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON campaigns;

CREATE POLICY "Public Read Access" ON campaigns FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON campaigns FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access" ON campaigns FOR DELETE USING (true);

-- 2. MASTER_BRANDS TABLE
ALTER TABLE master_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access" ON master_brands;
DROP POLICY IF EXISTS "Public Insert Access" ON master_brands;
DROP POLICY IF EXISTS "Public Update Access" ON master_brands;
DROP POLICY IF EXISTS "Public Delete Access" ON master_brands;

CREATE POLICY "Public Read Access" ON master_brands FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON master_brands FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON master_brands FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access" ON master_brands FOR DELETE USING (true);

-- 3. MASTER_SECTORS TABLE
ALTER TABLE master_sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access" ON master_sectors;
DROP POLICY IF EXISTS "Public Insert Access" ON master_sectors;
DROP POLICY IF EXISTS "Public Update Access" ON master_sectors;
DROP POLICY IF EXISTS "Public Delete Access" ON master_sectors;

CREATE POLICY "Public Read Access" ON master_sectors FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON master_sectors FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON master_sectors FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access" ON master_sectors FOR DELETE USING (true);

-- 4. CONFIRMATION
SELECT 'Access Restored' as status;
