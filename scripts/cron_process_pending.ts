// scripts/cron_process_pending.ts
// Cron job: Process pending campaigns through AI auto-fix pipeline
// Called by: GET /api/cron/process-pending or scheduled cron

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { runAiFixForCampaign, applyPatchToCampaign, saveAiFixResult } from '../src/services/aiAutoFix';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BATCH_LIMIT = 8; // Reduced from 25 to avoid rate limits

interface ProcessingResult {
    processed: number;
    auto_applied: number;
    needs_review: number;
    failed: number;
    rate_limited: number;
    errors: number;
}

async function processPendingCampaigns(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
        processed: 0,
        auto_applied: 0,
        needs_review: 0,
        failed: 0,
        rate_limited: 0,
        errors: 0
    };

    console.log(`🔄 Processing pending campaigns (limit: ${BATCH_LIMIT})...`);

    // Fetch campaigns that need processing
    const { data: audits, error } = await supabase
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
        .limit(BATCH_LIMIT);

    if (error) {
        console.error('❌ Error fetching audits:', error);
        return result;
    }

    if (!audits || audits.length === 0) {
        console.log('✅ No pending campaigns to process');
        return result;
    }

    console.log(`📊 Found ${audits.length} campaigns to process\n`);

    // Process each campaign
    for (const audit of audits) {
        result.processed++;
        const campaignId = audit.campaign_id;
        const campaignTitle = (audit.campaigns as any).title;

        console.log(`[${result.processed}/${audits.length}] Processing: ${campaignTitle} (ID: ${campaignId})`);

        try {
            // Convert issues to proper format
            const issueObjects = audit.issues.map((type: string) => ({
                type,
                severity: audit.severity,
                message: `Issue: ${type}`
            }));

            // Run AI fix
            const aiResult = await runAiFixForCampaign(campaignId, issueObjects);

            // Determine status based on confidence
            let aiStatus: 'auto_applied' | 'needs_review' | 'failed';
            let publishStatus: 'clean' | 'needs_review';

            if (aiResult.confidence >= 0.80) {
                // High confidence - auto apply with validation
                aiStatus = 'auto_applied';
                publishStatus = 'clean';

                // Apply patch with validation
                const applyResult = await applyPatchToCampaign(campaignId, aiResult.patch);

                if (applyResult.success) {
                    result.auto_applied++;
                    console.log(`   ✅ Auto-applied (confidence: ${aiResult.confidence.toFixed(2)})`);
                } else {
                    // Validation failed - move to needs_review
                    aiStatus = 'needs_review';
                    publishStatus = 'needs_review';
                    result.needs_review++;
                    console.log(`   ⚠️  Validation failed, needs review: ${applyResult.reason}`);
                }

            } else if (aiResult.confidence >= 0.55) {
                // Medium confidence - needs review
                aiStatus = 'needs_review';
                publishStatus = 'needs_review';
                result.needs_review++;
                console.log(`   ⚠️  Needs review (confidence: ${aiResult.confidence.toFixed(2)})`);

            } else {
                // Low confidence - failed
                aiStatus = 'failed';
                publishStatus = 'needs_review';
                result.failed++;
                console.log(`   ❌ Failed (confidence: ${aiResult.confidence.toFixed(2)})`);
            }

            // Save AI fix result to audit table
            await saveAiFixResult(audit.id, aiResult, aiStatus);

            // Update campaign publish status
            await supabase
                .from('campaigns')
                .update({
                    publish_status: publishStatus,
                    publish_updated_at: new Date().toISOString()
                })
                .eq('id', campaignId);

        } catch (err: any) {
            // Check if it's a rate limit error
            if (err.message?.includes('RATE_LIMITED')) {
                result.rate_limited++;

                // Keep as pending for retry
                await supabase
                    .from('campaign_quality_audits')
                    .update({
                        ai_notes: `Rate limited (429) at ${new Date().toISOString()}. Will retry in next batch.`,
                        ai_status: 'pending' // Keep as pending, not failed
                    })
                    .eq('id', audit.id);

                console.log(`   ⏳ Rate limited - will retry later`);
            } else {
                result.errors++;
                console.log(`   ❌ Error: ${err.message}`);
            }
        }
    }

    console.log('\n📈 Processing Summary:');
    console.log(`   Processed: ${result.processed}`);
    console.log(`   ✅ Auto-applied: ${result.auto_applied}`);
    console.log(`   ⚠️  Needs review: ${result.needs_review}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    console.log(`   ⏳ Rate limited: ${result.rate_limited}`);
    console.log(`   ⚠️  Errors: ${result.errors}`);

    return result;
}

// Main execution
if (require.main === module) {
    processPendingCampaigns()
        .then(() => {
            console.log('\n✅ Cron job completed');
            process.exit(0);
        })
        .catch((err) => {
            console.error('\n❌ Cron job failed:', err);
            process.exit(1);
        });
}

export { processPendingCampaigns };
