import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkWorldCampaigns() {
    console.log('🔍 Checking World Card campaigns in Supabase...\n');

    // Check all World-related campaigns
    const { data, error, count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact' })
        .or('provider.ilike.%World%,card_name.ilike.%World%');

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log(`📊 Total World campaigns: ${count}\n`);

    if (count === 0) {
        console.log('⚠️  NO WORLD CAMPAIGNS FOUND!\n');
        console.log('This means:');
        console.log('1. Either they were deleted');
        console.log('2. Or the scraper failed to save them\n');
    } else {
        console.log('✅ World campaigns exist\n');

        // Show sample
        console.log('Sample campaigns:');
        data?.slice(0, 5).forEach((c, i) => {
            console.log(`${i + 1}. ${c.title}`);
            console.log(`   Provider: ${c.provider}`);
            console.log(`   Card: ${c.card_name}`);
            console.log(`   Created: ${c.created_at}`);
            console.log('');
        });
    }

    // Check by provider specifically
    const providers = [
        'World Card (Yapı Kredi)',
        'Adios Card (Yapı Kredi)',
        'Play Card (Yapı Kredi)',
        'Crystal Card (Yapı Kredi)'
    ];

    console.log('\n📋 Breakdown by provider:\n');
    for (const provider of providers) {
        const { count } = await supabase
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('provider', provider);

        console.log(`${provider.padEnd(30)} : ${count || 0} campaigns`);
    }
}

checkWorldCampaigns();
