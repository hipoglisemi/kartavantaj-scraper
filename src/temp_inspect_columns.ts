
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from the scraper directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCampaigns() {
    console.log('🔍 Inspecting campaigns 14330-14341...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name, brand, sector_slug, bank_id, card_id, brand_id, sector_id, ai_enhanced, ai_parsing_incomplete')
        .gte('id', 14330)
        .lte('id', 14341)
        .order('id', { ascending: true });

    if (error) {
        console.error('❌ Error fetching campaigns:', error);
        return;
    }

    console.log(JSON.stringify(data.map(c => ({
        id: c.id,
        title: c.title,
        bank: c.bank,
        card: c.card_name,
        brand: c.brand,
        sector: c.sector_slug,
        bank_id: c.bank_id,
        card_id: c.card_id,
        brand_id: c.brand_id,
        sector_id: c.sector_id,
        ai: c.ai_enhanced,
        incomplete: c.ai_parsing_incomplete
    })), null, 2));
}

inspectCampaigns();
