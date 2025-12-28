import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkScrapedCampaigns() {
    console.log('🔍 Checking scraped campaigns...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, earning, discount, min_spend, eligible_customers, participation_method, brand, badge_text')
        .order('id', { ascending: true });

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log(`✅ Found ${campaigns?.length || 0} campaigns\n`);
    console.log('─'.repeat(120));

    campaigns?.forEach((c, i) => {
        console.log(`\n${i + 1}. ${c.title}`);
        console.log(`   ID: ${c.id}`);
        console.log(`   Brand: ${c.brand || 'NULL'}`);
        console.log(`   Badge: ${c.badge_text || 'NULL'}`);
        console.log(`   Earning: ${c.earning || 'NULL'}`);
        console.log(`   Min Spend: ${c.min_spend || 'NULL'}`);
        console.log(`   Eligible: ${c.eligible_customers ? JSON.stringify(c.eligible_customers) : 'NULL'}`);
        console.log(`   Method: ${c.participation_method || 'NULL'}`);
    });

    console.log('\n' + '─'.repeat(120));
}

checkScrapedCampaigns();
