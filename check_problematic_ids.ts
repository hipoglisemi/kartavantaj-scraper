import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkSpecificIDs() {
    const ids = [17347, 17344];
    const rangeStart = 17114;
    const rangeEnd = 17120; // Checking a small sample from the range first

    console.log('🔍 Checking specific campaigns...');

    const { data: specificData, error: e1 } = await supabase
        .from('campaigns')
        .select('id, title, eligible_customers, reference_url, bank, card_name')
        .in('id', ids);

    if (e1) console.error('Error fetching specific IDs:', e1.message);
    else {
        specificData.forEach(c => {
            console.log(`\nID: ${c.id}`);
            console.log(`Title: ${c.title}`);
            console.log(`Bank/Card: ${c.bank} / ${c.card_name}`);
            console.log(`Eligible:`, c.eligible_customers);
            console.log(`URL: ${c.reference_url}`);
        });
    }

    console.log('\n🔍 Checking range sample (17114-17120)...');
    const { data: rangeData, error: e2 } = await supabase
        .from('campaigns')
        .select('id, title, eligible_customers, reference_url, bank, card_name')
        .gte('id', rangeStart)
        .lte('id', rangeEnd);

    if (e2) console.error('Error fetching range:', e2.message);
    else {
        rangeData.forEach(c => {
            console.log(`\nID: ${c.id}`);
            console.log(`Title: ${c.title}`);
            console.log(`Eligible:`, c.eligible_customers);
        });
    }
}

checkSpecificIDs();
