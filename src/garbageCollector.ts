
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function garbageCollect() {
    console.log('🧹 Running Garbage Collector for Expired Campaigns...');

    // Calculate date 10 days ago
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const dateStr = tenDaysAgo.toISOString().split('T')[0];

    console.log(`📅 Deleting campaigns expired before: ${dateStr}`);

    // Count first
    const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .lt('valid_until', dateStr);

    if (count === 0) {
        console.log('✅ No old campaigns to delete.');
        return;
    }

    console.log(`🗑️  Found ${count} old campaigns. Deleting...`);

    const { error } = await supabase
        .from('campaigns')
        .delete()
        .lt('valid_until', dateStr);

    if (error) {
        console.error('❌ Error deleting old campaigns:', error.message);
    } else {
        console.log(`✅ Successfully cleaned up ${count} expired campaigns.`);
    }
}

garbageCollect();
