import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkCampaignCounts() {
    console.log('🔍 Checking campaign counts and health...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('bank, ai_parsing_incomplete, ai_enhanced, id');

    if (error) {
        console.error('❌ Error fetching campaigns:', error.message);
        return;
    }

    const stats: Record<string, { total: number, incomplete: number, enhanced: number }> = {};

    campaigns?.forEach(c => {
        const bank = c.bank || 'Unknown';
        if (!stats[bank]) {
            stats[bank] = { total: 0, incomplete: 0, enhanced: 0 };
        }
        stats[bank].total++;
        if (c.ai_parsing_incomplete) stats[bank].incomplete++;
        if (c.ai_enhanced) stats[bank].enhanced++;
    });

    console.log('📊 Campaign Stats by Bank:');
    console.table(stats);

    const totalIncomplete = Object.values(stats).reduce((acc, curr) => acc + curr.incomplete, 0);
    if (totalIncomplete > 0) {
        console.log(`\n⚠️ Found ${totalIncomplete} campaigns with incomplete AI parsing.`);
    } else {
        console.log('\n✅ No incomplete AI parsing detected.');
    }
}

checkCampaignCounts();
