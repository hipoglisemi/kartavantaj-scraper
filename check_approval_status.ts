import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkCampaignStatus() {
    console.log('🔍 Checking campaign approval status...\n');

    // Check total campaigns
    const { count: total } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

    // Check approved campaigns
    const { count: approved } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true);

    // Check unapproved campaigns
    const { count: unapproved } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);

    // Check null is_approved
    const { count: nullApproved } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .is('is_approved', null);

    console.log('📊 Campaign Status Summary:');
    console.log('─'.repeat(60));
    console.log(`Total Campaigns:        ${total}`);
    console.log(`✅ Approved (true):     ${approved}`);
    console.log(`❌ Unapproved (false):  ${unapproved}`);
    console.log(`⚠️  NULL is_approved:   ${nullApproved}`);
    console.log('─'.repeat(60));

    // Get sample unapproved campaigns
    const { data: unapprovedSamples } = await supabase
        .from('campaigns')
        .select('title, bank, card_name, created_at, is_approved, ai_parsing_incomplete, missing_fields')
        .eq('is_approved', false)
        .order('created_at', { ascending: false })
        .limit(10);

    if (unapprovedSamples && unapprovedSamples.length > 0) {
        console.log('\n❌ Sample Unapproved Campaigns:\n');
        unapprovedSamples.forEach((c, i) => {
            console.log(`${i + 1}. ${c.title}`);
            console.log(`   Bank: ${c.bank} | Card: ${c.card_name}`);
            console.log(`   Created: ${c.created_at}`);
            console.log(`   AI Incomplete: ${c.ai_parsing_incomplete}`);
            console.log(`   Missing Fields: ${c.missing_fields || 'none'}`);
            console.log('');
        });
    }

    // Check if there's a pattern
    const { data: byBank } = await supabase
        .from('campaigns')
        .select('bank, is_approved')
        .eq('is_approved', false);

    if (byBank) {
        const bankGroups: any = {};
        byBank.forEach(c => {
            const bank = c.bank || 'NULL';
            bankGroups[bank] = (bankGroups[bank] || 0) + 1;
        });

        console.log('\n📋 Unapproved Campaigns by Bank:\n');
        Object.entries(bankGroups)
            .sort((a: any, b: any) => b[1] - a[1])
            .forEach(([bank, count]) => {
                console.log(`${String(bank).padEnd(25)} : ${count} campaigns`);
            });
    }
}

checkCampaignStatus();
