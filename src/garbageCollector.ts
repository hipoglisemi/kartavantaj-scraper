
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

    console.log(`📦 Archiving campaigns expired before: ${dateStr}`);

    // Count first
    const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .lt('valid_until', dateStr)
        .neq('publish_status', 'archived');

    if (!count || count === 0) {
        console.log('✅ No new campaigns to archive.');
        return;
    }

    console.log(`📂 Found ${count} expired campaigns. Archiving...`);

    const { error } = await supabase
        .from('campaigns')
        .update({
            publish_status: 'archived',
            is_active: false
        })
        .lt('valid_until', dateStr)
        .or('publish_status.neq.archived,is_active.eq.true');

    if (error) {
        console.error('❌ Error archiving old campaigns:', error.message);
    } else {
        console.log(`✅ Successfully archived ${count} expired campaigns.`);
    }
}

garbageCollect();
