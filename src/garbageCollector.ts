
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function garbageCollect() {
    console.log('🧹 Running Garbage Collector for Campaigns...\n');

    // ============================================
    // STAGE 1: Deactivate Expired Campaigns
    // ============================================
    console.log('📦 STAGE 1: Deactivating expired campaigns...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(`   Today: ${todayStr}`);
    console.log(`   Deactivating campaigns with valid_until < ${todayStr}\n`);

    // Count expired campaigns that are still active
    const { count: expiredCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .lt('valid_until', todayStr)
        .eq('is_active', true);

    if (!expiredCount || expiredCount === 0) {
        console.log('   ✅ No expired campaigns to deactivate.\n');
    } else {
        console.log(`   📂 Found ${expiredCount} expired campaigns. Deactivating...`);

        const { error: deactivateError } = await supabase
            .from('campaigns')
            .update({
                is_active: false
            })
            .lt('valid_until', todayStr)
            .eq('is_active', true);

        if (deactivateError) {
            console.error(`   ❌ Error deactivating expired campaigns: ${deactivateError.message}\n`);
        } else {
            console.log(`   ✅ Successfully deactivated ${expiredCount} expired campaigns.\n`);
        }
    }

    // ============================================
    // STAGE 2: Delete Old Inactive Campaigns
    // ============================================
    console.log('🗑️  STAGE 2: Deleting old inactive campaigns...');

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const tenDaysAgoStr = tenDaysAgo.toISOString().split('T')[0];

    console.log(`   Deleting inactive campaigns older than: ${tenDaysAgoStr}\n`);

    // Count old inactive campaigns
    const { count: oldInactiveCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false)
        .lt('valid_until', tenDaysAgoStr);

    if (!oldInactiveCount || oldInactiveCount === 0) {
        console.log('   ✅ No old inactive campaigns to delete.\n');
    } else {
        console.log(`   🗑️  Found ${oldInactiveCount} old inactive campaigns. Deleting...`);

        const { error: deleteError } = await supabase
            .from('campaigns')
            .delete()
            .eq('is_active', false)
            .lt('valid_until', tenDaysAgoStr);

        if (deleteError) {
            console.error(`   ❌ Error deleting old inactive campaigns: ${deleteError.message}\n`);
        } else {
            console.log(`   ✅ Successfully deleted ${oldInactiveCount} old inactive campaigns.\n`);
        }
    }

    // ============================================
    // Summary
    // ============================================
    console.log('📊 SUMMARY:');
    console.log(`   Deactivated: ${expiredCount || 0} expired campaigns`);
    console.log(`   Deleted: ${oldInactiveCount || 0} old inactive campaigns`);
    console.log('\n✅ Garbage collection completed!');
}

garbageCollect();
