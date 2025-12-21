import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkDataQuality() {
    console.log('🔍 Checking campaign data quality...\n');

    // Check AI parsing incomplete
    const { count: aiIncomplete } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('ai_parsing_incomplete', true);

    // Check missing critical fields
    const { data: allCampaigns } = await supabase
        .from('campaigns')
        .select('title, bank, card_name, description, image_url, valid_until, min_spend, earning, category, ai_parsing_incomplete, missing_fields')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log('📊 Data Quality Summary:');
    console.log('─'.repeat(60));
    console.log(`AI Parsing Incomplete:  ${aiIncomplete}`);
    console.log('─'.repeat(60));

    if (allCampaigns) {
        console.log('\n📋 Latest 20 Campaigns - Field Check:\n');

        let issueCount = 0;
        allCampaigns.forEach((c, i) => {
            const issues = [];

            if (!c.description || c.description.length < 10) issues.push('❌ description');
            if (!c.image_url) issues.push('❌ image_url');
            if (!c.valid_until) issues.push('❌ valid_until');
            if (!c.min_spend && c.min_spend !== 0) issues.push('⚠️  min_spend');
            if (!c.earning) issues.push('⚠️  earning');
            if (!c.category) issues.push('❌ category');

            if (issues.length > 0) {
                issueCount++;
                console.log(`${i + 1}. ${c.title?.substring(0, 50)}...`);
                console.log(`   Bank: ${c.bank} | Card: ${c.card_name}`);
                console.log(`   Issues: ${issues.join(', ')}`);
                console.log(`   AI Incomplete: ${c.ai_parsing_incomplete}`);
                console.log(`   Missing Fields: ${c.missing_fields || 'none'}`);
                console.log('');
            }
        });

        console.log(`\n📊 ${issueCount} out of 20 campaigns have data issues\n`);
    }

    // Check specific patterns
    const { data: noImage } = await supabase
        .from('campaigns')
        .select('count')
        .is('image_url', null);

    const { data: noDescription } = await supabase
        .from('campaigns')
        .select('count')
        .is('description', null);

    const { data: noCategory } = await supabase
        .from('campaigns')
        .select('count')
        .is('category', null);

    console.log('🔍 Missing Field Statistics:');
    console.log('─'.repeat(60));
    console.log(`Campaigns without image_url:    ${noImage?.length || 0}`);
    console.log(`Campaigns without description:  ${noDescription?.length || 0}`);
    console.log(`Campaigns without category:     ${noCategory?.length || 0}`);
}

checkDataQuality();
