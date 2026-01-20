
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function inspectBonus() {
    console.log('🔍 Inspecting Bonus Campaigns...');

    // Fetch campaigns mentioning Bonus in card_name
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name')
        .ilike('card_name', '%Bonus%')
        .limit(50);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`Found ${campaigns.length} campaigns with card_name 'Bonus'. Sample:`);

    const byBank = {};

    campaigns.forEach(c => {
        if (!byBank[c.bank]) byBank[c.bank] = [];
        byBank[c.bank].push(`${c.id}: ${c.title} (${c.card_name})`);
    });

    console.log(JSON.stringify(byBank, null, 2));
}

inspectBonus();
