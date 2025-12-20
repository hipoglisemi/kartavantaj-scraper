/**
 * Check for campaigns with missing earning or min_spend
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkMissing() {
    console.log('\n🔍 Checking for missing earning/min_spend...\n');

    // Fetch campaigns
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, earning, min_spend, url')
        .eq('provider', 'World Card (Yapı Kredi)')
        .or('earning.is.null,earning.eq."",min_spend.is.null');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No campaigns found with missing earning or min_spend');
        return;
    }

    console.log(`📊 Found ${campaigns.length} campaigns with missing data\n`);

    campaigns.forEach((c, i) => {
        console.log(`${i + 1}. ${c.title}`);
        console.log(`   URL: ${c.url}`);
        console.log(`   Earning: ${c.earning === null ? 'NULL' : c.earning === '' ? 'EMPTY' : c.earning}`);
        console.log(`   Min Spend: ${c.min_spend === null ? 'NULL' : c.min_spend}`);
        console.log('');
    });
}

checkMissing().catch(console.error);
