// scripts/verify_production.ts
// Production verification script - run after deployment

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function verifyProduction() {
    console.log('🔍 Production Verification\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Variables for health check
    let statusCounts: Record<string, number> = {};
    let successRate = '0.0';
    let failed = 0;
    let total = 0;

    // 1. Database Status
    console.log('1️⃣ DATABASE STATUS');
    console.log('─────────────────────────────────────────────────────────');

    const { data: publishStatus } = await supabase
        .from('campaigns')
        .select('publish_status');

    if (publishStatus) {
        publishStatus.forEach(c => {
            statusCounts[c.publish_status] = (statusCounts[c.publish_status] || 0) + 1;
        });

        console.log('   Campaigns by publish_status:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            const icon = status === 'clean' ? '🟢' : status === 'needs_review' ? '🟡' : '⏳';
            console.log(`      ${icon} ${status}: ${count}`);
        });
    }

    const { data: aiStatus } = await supabase
        .from('campaign_quality_audits')
        .select('ai_status');

    if (aiStatus) {
        const aiCounts: Record<string, number> = {};
        aiStatus.forEach(a => {
            aiCounts[a.ai_status] = (aiCounts[a.ai_status] || 0) + 1;
        });

        console.log('\n   Audits by ai_status:');
        Object.entries(aiCounts).forEach(([status, count]) => {
            const icon = status === 'auto_applied' ? '✅' :
                status === 'needs_review' ? '⚠️' :
                    status === 'failed' ? '❌' : '⏳';
            console.log(`      ${icon} ${status}: ${count}`);
        });
    }

    // 2. Auto-Apply Success Rate
    console.log('\n2️⃣ AUTO-APPLY SUCCESS RATE');
    console.log('─────────────────────────────────────────────────────────');

    const { data: processed } = await supabase
        .from('campaign_quality_audits')
        .select('ai_status')
        .in('ai_status', ['auto_applied', 'needs_review', 'failed']);

    if (processed) {
        const autoApplied = processed.filter(a => a.ai_status === 'auto_applied').length;
        const needsReview = processed.filter(a => a.ai_status === 'needs_review').length;
        failed = processed.filter(a => a.ai_status === 'failed').length;
        total = processed.length;

        successRate = total > 0 ? (autoApplied / total * 100).toFixed(1) : '0.0';

        console.log(`   Total Processed: ${total}`);
        console.log(`   ✅ Auto-applied: ${autoApplied} (${successRate}%)`);
        console.log(`   ⚠️  Needs review: ${needsReview} (${(needsReview / total * 100).toFixed(1)}%)`);
        console.log(`   ❌ Failed: ${failed} (${(failed / total * 100).toFixed(1)}%)`);
    }

    // 3. Rate Limit Check
    console.log('\n3️⃣ RATE LIMIT CHECK');
    console.log('─────────────────────────────────────────────────────────');

    const { data: rateLimited } = await supabase
        .from('campaign_quality_audits')
        .select('id, ai_notes')
        .ilike('ai_notes', '%rate limited%');

    console.log(`   Rate limited campaigns: ${rateLimited?.length || 0}`);
    if (rateLimited && rateLimited.length > 0) {
        console.log('   ⚠️  Warning: Some campaigns are rate limited');
        console.log('   → Check if they are being retried');
    } else {
        console.log('   ✅ No rate limit issues');
    }

    // 4. Validation Failures
    console.log('\n4️⃣ VALIDATION FAILURES');
    console.log('─────────────────────────────────────────────────────────');

    const { data: validationFailed } = await supabase
        .from('campaign_quality_audits')
        .select('id, ai_notes')
        .ilike('ai_notes', '%validation failed%');

    console.log(`   Validation failures: ${validationFailed?.length || 0}`);
    if (validationFailed && validationFailed.length > 0) {
        console.log('   ⚠️  Some patches failed validation');
        console.log('   → These campaigns moved to needs_review');
    } else {
        console.log('   ✅ No validation failures');
    }

    // 5. Recent Activity
    console.log('\n5️⃣ RECENT ACTIVITY (Last 24 hours)');
    console.log('─────────────────────────────────────────────────────────');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentAutoApplied } = await supabase
        .from('campaign_quality_audits')
        .select('id, campaign_id, ai_confidence, ai_applied_at')
        .eq('ai_status', 'auto_applied')
        .gte('ai_applied_at', yesterday.toISOString())
        .order('ai_applied_at', { ascending: false })
        .limit(5);

    if (recentAutoApplied && recentAutoApplied.length > 0) {
        console.log(`   Recent auto-applied: ${recentAutoApplied.length}`);
        recentAutoApplied.forEach(a => {
            const time = new Date(a.ai_applied_at).toLocaleString();
            console.log(`      Campaign ${a.campaign_id}: confidence ${a.ai_confidence?.toFixed(2)} at ${time}`);
        });
    } else {
        console.log('   ⚠️  No recent auto-applied campaigns');
        console.log('   → Check if cron is running');
    }

    // 6. Health Check
    console.log('\n6️⃣ HEALTH CHECK');
    console.log('─────────────────────────────────────────────────────────');

    const { data: pending } = await supabase
        .from('campaign_quality_audits')
        .select('id')
        .eq('ai_status', 'pending');

    const pendingCount = pending?.length || 0;

    const checks = {
        'Clean campaigns exist': (statusCounts?.['clean'] || 0) > 0,
        'Pending queue manageable': pendingCount < 100,
        'Auto-apply rate healthy': parseFloat(successRate) > 50,
        'No excessive failures': failed < total * 0.2,
        'Recent activity': (recentAutoApplied?.length || 0) > 0
    };

    Object.entries(checks).forEach(([check, passed]) => {
        const icon = passed ? '✅' : '❌';
        console.log(`   ${icon} ${check}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════\n');

    // Final verdict
    const allPassed = Object.values(checks).every(v => v);
    if (allPassed) {
        console.log('🎉 PRODUCTION VERIFICATION PASSED');
        console.log('   System is healthy and operating normally.\n');
    } else {
        console.log('⚠️  PRODUCTION VERIFICATION WARNINGS');
        console.log('   Some checks failed. Review the issues above.\n');
    }
}

verifyProduction().catch(console.error);
