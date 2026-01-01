
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
    // STAGE 1: Archive Expired Campaigns
    // ============================================
    console.log('📦 STAGE 1: Archiving expired campaigns...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(`   Today: ${todayStr}`);
    console.log(`   Archiving campaigns with valid_until < ${todayStr}\n`);

    // Count expired campaigns
    const { count: expiredCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .lt('valid_until', todayStr)
        .neq('publish_status', 'archived');

    if (!expiredCount || expiredCount === 0) {
        console.log('   ✅ No expired campaigns to archive.\n');
    } else {
        console.log(`   📂 Found ${expiredCount} expired campaigns. Archiving...`);

        const { error: archiveError } = await supabase
            .from('campaigns')
            .update({
                publish_status: 'archived',
                is_active: false
            })
            .lt('valid_until', todayStr)
            .neq('publish_status', 'archived');

        if (archiveError) {
            console.error(`   ❌ Error archiving expired campaigns: ${archiveError.message}\n`);
        } else {
            console.log(`   ✅ Successfully archived ${expiredCount} expired campaigns.\n`);
        }
    }

    // ============================================
    // STAGE 2: Delete Old Archived Campaigns
    // ============================================
    console.log('🗑️  STAGE 2: Deleting old archived campaigns...');
    
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const tenDaysAgoStr = tenDaysAgo.toISOString().split('T')[0];

    console.log(`   Deleting archived campaigns older than: ${tenDaysAgoStr}\n`);

    // Count old archived campaigns
    const { count: oldArchivedCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('publish_status', 'archived')
        .lt('valid_until', tenDaysAgoStr);

    if (!oldArchivedCount || oldArchivedCount === 0) {
        console.log('   ✅ No old archived campaigns to delete.\n');
    } else {
        console.log(`   🗑️  Found ${oldArchivedCount} old archived campaigns. Deleting...`);

        const { error: deleteError } = await supabase
            .from('campaigns')
            .delete()
            .eq('publish_status', 'archived')
            .lt('valid_until', tenDaysAgoStr);

        if (deleteError) {
            console.error(`   ❌ Error deleting old archived campaigns: ${deleteError.message}\n`);
        } else {
            console.log(`   ✅ Successfully deleted ${oldArchivedCount} old archived campaigns.\n`);
        }
    }

    // ============================================
    // Summary
    // ============================================
    console.log('📊 SUMMARY:');
    console.log(`   Archived: ${expiredCount || 0} expired campaigns`);
    console.log(`   Deleted: ${oldArchivedCount || 0} old archived campaigns`);
    console.log('\n✅ Garbage collection completed!');
}

garbageCollect();
