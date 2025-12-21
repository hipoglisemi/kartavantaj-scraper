
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkData() {
    console.log('🔍 Querying Supabase for campaign category status...\n');

    // 1. Get stats
    const { data: allStats, error: statsError } = await supabase
        .from('campaigns')
        .select('id, category, sector_slug');

    if (statsError) {
        console.error('❌ Error fetching stats:', statsError.message);
        return;
    }

    const total = allStats.length;
    const nullCategory = allStats.filter(c => !c.category).length;
    const nullSlug = allStats.filter(c => !c.sector_slug).length;

    console.log(`📊 Total Campaigns: ${total}`);
    console.log(`⚠️  Missing Category: ${nullCategory}`);
    console.log(`⚠️  Missing Sector Slug: ${nullSlug}\n`);

    // 2. Show samples of problematic ones
    if (nullCategory > 0) {
        console.log('📋 Sample campaigns with missing data:');
        const { data: samples } = await supabase
            .from('campaigns')
            .select('id, title, bank, category, sector_slug')
            .or('category.is.null,sector_slug.is.null')
            .limit(10);

        console.table(samples);
    } else {
        console.log('✅ No campaigns found with missing category data.');
    }

    // 3. Show most recent 5 campaigns
    console.log('\n📅 Most recent 5 campaigns:');
    const { data: recent } = await supabase
        .from('campaigns')
        .select('id, title, bank, category, sector_slug')
        .order('created_at', { ascending: false })
        .limit(5);

    console.table(recent);
}

checkData();
