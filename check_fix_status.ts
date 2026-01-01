import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkRange() {
    const startId = 17114;
    const endId = 17120; // User asked for 114 to 120

    console.log(`🔍 Checking campaigns ${startId}-${endId}...`);

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, eligible_customers, card_name')
        .gte('id', startId)
        .lte('id', endId)
        .order('id');

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    let allFixed = true;
    data.forEach(c => {
        const isFixed = Array.isArray(c.eligible_customers) && c.eligible_customers.length > 1;
        const status = isFixed ? '✅ FIXED' : '⚠️  PENDING';
        if (!isFixed) allFixed = false;

        console.log(`${status} [${c.id}] ${c.title}`);
        console.log(`   Cards: ${JSON.stringify(c.eligible_customers)}`);
    });

    if (allFixed) {
        console.log('\n🎉 All campaigns in range are FIXED!');
    } else {
        console.log('\n⏳ Some campaigns are still pending re-scrape.');
    }
}

checkRange();
