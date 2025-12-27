-- Migration: Operation Info Standardization
-- Standardizing Eligible Cards, Participation Method, and Spend Channel

-- 1. Add new columns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS eligible_cards TEXT[], -- Preferred over valid_cards
ADD COLUMN IF NOT EXISTS spend_channel TEXT, -- Enum: IN_STORE_POS, ONLINE, IN_APP, MERCHANT_SPECIFIC, MEMBER_MERCHANT, UNKNOWN
ADD COLUMN IF NOT EXISTS spend_channel_detail TEXT;

-- 2. Update participation_method to store Enums
-- (We keep the existing column name but change the data content to Enums: AUTO, SMS, JUZDAN, MOBILE_APP, CALL_CENTER, WEB)
-- We don't use strict Postgres Enum type for flexibility during transition, but enforce via logic.

-- 3. Comments for documentation
COMMENT ON COLUMN campaigns.eligible_cards IS 'Normalize edilmiş geçerli kart listesi (Axess, Wings vb.)';
COMMENT ON COLUMN campaigns.participation_method IS 'Enum: AUTO, SMS, JUZDAN, MOBILE_APP, CALL_CENTER, WEB';
COMMENT ON COLUMN campaigns.spend_channel IS 'Enum: IN_STORE_POS, ONLINE, IN_APP, MERCHANT_SPECIFIC, MEMBER_MERCHANT, UNKNOWN';
COMMENT ON COLUMN campaigns.spend_channel_detail IS 'Kanal detayları (örn: "Sadece temassız ödemelerde geçerlidir")';

-- 4. Index for filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_spend_channel ON campaigns(spend_channel);
