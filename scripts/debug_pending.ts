// scripts/debug_pending.ts
// Debug script to see what campaigns are pending

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function debugPending() {
    console.log('🔍 Debugging pending campaigns...\n');

    // Check 1: Audits with pending/failed status
    const { data: pendingAudits, error: error1 } = await supabase
        .from('campaign_quality_audits')
        .select('id, campaign_id, ai_status, severity')
        .in('ai_status', ['pending', 'failed'])
        .limit(10);

    console.log('1️⃣ Audits with ai_status IN (pending, failed):');
    console.log(`   Found: ${pendingAudits?.length || 0}`);
    if (pendingAudits && pendingAudits.length > 0) {
        pendingAudits.forEach(a => {
            console.log(`   - Campaign ${a.campaign_id}: ${a.ai_status} (${a.severity})`);
        });
    }

    // Check 2: Campaigns with processing status
    const { data: processingCampaigns, error: error2 } = await supabase
        .from('campaigns')
        .select('id, title, publish_status')
        .eq('publish_status', 'processing')
        .limit(10);

    console.log('\n2️⃣ Campaigns with publish_status=processing:');
    console.log(`   Found: ${processingCampaigns?.length || 0}`);
    if (processingCampaigns && processingCampaigns.length > 0) {
        processingCampaigns.forEach(c => {
            console.log(`   - ${c.id}: ${c.title}`);
        });
    }

    // Check 3: What the cron query would find
    const { data: cronQuery, error: error3 } = await supabase
        .from('campaign_quality_audits')
        .select(`
            id,
            campaign_id,
            severity,
            issues,
            ai_status,
            campaigns!inner(
                id,
                title,
                publish_status
            )
        `)
        .in('ai_status', ['pending', 'failed'])
        .eq('severity', 'HIGH')
        .limit(25);

    console.log('\n3️⃣ What cron query finds (HIGH severity, pending/failed):');
    console.log(`   Found: ${cronQuery?.length || 0}`);
    if (cronQuery && cronQuery.length > 0) {
        cronQuery.forEach((a: any) => {
            console.log(`   - Campaign ${a.campaign_id}: ai_status=${a.ai_status}, publish_status=${a.campaigns.publish_status}`);
        });
    }

    // Check 4: Distribution
    const { data: allAudits } = await supabase
        .from('campaign_quality_audits')
        .select('ai_status, severity');

    if (allAudits) {
        const statusCounts: Record<string, number> = {};
        const severityCounts: Record<string, number> = {};

        allAudits.forEach(a => {
            statusCounts[a.ai_status] = (statusCounts[a.ai_status] || 0) + 1;
            severityCounts[a.severity] = (severityCounts[a.severity] || 0) + 1;
        });

        console.log('\n4️⃣ Overall distribution:');
        console.log('   AI Status:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`      ${status}: ${count}`);
        });
        console.log('   Severity:');
        Object.entries(severityCounts).forEach(([severity, count]) => {
            console.log(`      ${severity}: ${count}`);
        });
    }
}

debugPending().catch(console.error);
