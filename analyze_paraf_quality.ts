import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function analyze() {
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'Halkbank')
        .order('created_at', { ascending: false })
        .limit(10);

    if (!campaigns || campaigns.length === 0) {
        console.log('❌ No campaigns found for Halkbank.');
        return;
    }

    console.log(`\n🔍 Analyzing last ${campaigns.length} Paraf Campaigns:\n`);

    let okImages = 0;
    let okFinancials = 0;

    campaigns.forEach(c => {
        const hasImage = c.image && c.image.startsWith('http');
        const hasFinance = (c.earning && c.earning.length > 3) || c.min_spend > 0;
        
        if (hasImage) okImages++;
        if (hasFinance) okFinancials++;

        console.log(`[${c.id}] ${c.title.substring(0, 50)}...`);
        console.log(`   🖼️  Img: ${hasImage ? '✅' : '❌'} ${c.image ? c.image.substring(0, 30)+'...' : 'NULL'}`);
        console.log(`   💰 Earn: ${c.earning || 'NULL'} | Spend: ${c.min_spend}`);
        console.log(`   📅 Valid: ${c.valid_until || 'NULL'}`);
        console.log('---');
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Images: ${okImages}/${campaigns.length} (${(okImages/campaigns.length*100).toFixed(0)}%)`);
    console.log(`   Financials: ${okFinancials}/${campaigns.length} (${(okFinancials/campaigns.length*100).toFixed(0)}%)`);
}

analyze();
