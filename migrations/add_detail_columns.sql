-- Add detail columns for eligible_cards and participation
-- These are optional JSONB columns for complex campaigns

-- Add eligible_cards_detail column
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS eligible_cards_detail JSONB DEFAULT NULL;

COMMENT ON COLUMN campaigns.eligible_cards_detail IS 
'Optional detailed card eligibility info. Format: {variants: [], exclude: [], notes: ""}';

-- Add participation_detail column
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS participation_detail JSONB DEFAULT NULL;

COMMENT ON COLUMN campaigns.participation_detail IS 
'Optional detailed participation info. Format: {sms_to: "", sms_keyword: "", instructions: "", constraints: []}';

-- Example data:
-- eligible_cards_detail: {"variants": ["Gold", "Platinum"], "exclude": ["Classic"], "notes": "Ticari kartlar hariç"}
-- participation_detail: {"sms_to": "4442525", "sms_keyword": "KATIL", "instructions": "KATIL yazıp 4442525'e gönderin", "constraints": ["Harcamadan önce katılım gereklidir"]}
