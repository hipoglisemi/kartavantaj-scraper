// scripts/test_ai_autofix.ts
// DRY RUN TEST for AI Auto-Fix System
// NO ACTUAL UPDATES TO CAMPAIGNS TABLE

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { runAiFixForCampaign, saveAiFixResult } from '../src/services/aiAutoFix';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

interface TestResult {
    campaignId: number;
    campaignTitle: string;
    issues: string[];
    patch: Record<string, any>;
    confidence: number;
    category: 'auto_apply' | 'needs_review' | 'failed';
    cacheHit: boolean;
}

async function verifyDatabaseSchema() {
    console.log('📋 Step 1: Database Schema Verification\n');

    // Check if new columns exist
    const { data: columns, error } = await supabase
        .from('campaign_quality_audits')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error querying table:', error);
        return false;
    }

    const requiredColumns = [
        'ai_status', 'ai_confidence', 'ai_patch', 'ai_notes', 'ai_model', 'ai_applied_at',
        'status', 'reviewed_by', 'reviewed_at', 'resolution_notes', 'overrides'
    ];

    const existingColumns = columns && columns.length > 0 ? Object.keys(columns[0]) : [];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
        console.log(`❌ Missing columns: ${missingColumns.join(', ')}`);
        return false;
    }

    console.log('✅ All required columns exist');

    // Check record counts
    const { count: totalAudits } = await supabase
        .from('campaign_quality_audits')
        .select('*', { count: 'exact', head: true });

    const { count: highSeverity } = await supabase
        .from('campaign_quality_audits')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'HIGH');

    console.log(`   Total audit records: ${totalAudits}`);
    console.log(`   HIGH severity: ${highSeverity}`);
    console.log();

    return true;
}

async function runDryRunTests() {
    console.log('🧪 Step 2: AI Auto-Fix Dry Run (10 HIGH severity campaigns)\n');

    // Fetch 10 HIGH severity audits
    const { data: audits, error } = await supabase
        .from('campaign_quality_audits')
        .select('id, campaign_id, severity, issues, clean_text_snippet')
        .eq('severity', 'HIGH')
        .eq('ai_status', 'pending')
        .limit(10);

    if (error || !audits || audits.length === 0) {
        console.log('❌ No HIGH severity audits found or error:', error);
        return [];
    }

    console.log(`   Found ${audits.length} HIGH severity audits to test\n`);

    const results: TestResult[] = [];

    for (let i = 0; i < audits.length; i++) {
        const audit = audits[i];
        console.log(`   [${i + 1}/${audits.length}] Processing campaign ${audit.campaign_id}...`);

        try {
            // Fetch campaign title
            const { data: campaign } = await supabase
                .from('campaigns')
                .select('title')
                .eq('id', audit.campaign_id)
                .single();

            const issueObjects = audit.issues.map((type: string) => ({
                type,
                severity: audit.severity,
                message: `Issue: ${type}`
            }));

            // Run AI fix (first time)
            const startTime = Date.now();
            const aiResult = await runAiFixForCampaign(audit.campaign_id, issueObjects);
            const firstRunTime = Date.now() - startTime;

            // Categorize by confidence
            let category: 'auto_apply' | 'needs_review' | 'failed';
            if (aiResult.confidence >= 0.80) {
                category = 'auto_apply';
            } else if (aiResult.confidence >= 0.55) {
                category = 'needs_review';
            } else {
                category = 'failed';
            }

            // Save AI result to DB (DRY RUN - only save to audit table, not campaigns)
            const aiStatus = category === 'auto_apply' ? 'auto_applied' :
                category === 'needs_review' ? 'needs_review' : 'failed';

            await saveAiFixResult(audit.id, aiResult, aiStatus);

            // Test cache (second run)
            const cacheStartTime = Date.now();
            await runAiFixForCampaign(audit.campaign_id, issueObjects);
            const secondRunTime = Date.now() - cacheStartTime;

            const cacheHit = secondRunTime < (firstRunTime * 0.5); // Cache should be much faster

            results.push({
                campaignId: audit.campaign_id,
                campaignTitle: campaign?.title || 'Unknown',
                issues: audit.issues,
                patch: aiResult.patch,
                confidence: aiResult.confidence,
                category,
                cacheHit
            });

            console.log(`      ✓ Confidence: ${aiResult.confidence.toFixed(2)} → ${category}`);
            console.log(`      ✓ Cache: ${cacheHit ? 'HIT' : 'MISS'} (${firstRunTime}ms → ${secondRunTime}ms)`);

        } catch (err: any) {
            console.log(`      ✗ Error: ${err.message}`);
            results.push({
                campaignId: audit.campaign_id,
                campaignTitle: 'Error',
                issues: audit.issues,
                patch: {},
                confidence: 0,
                category: 'failed',
                cacheHit: false
            });
        }
    }

    console.log();
    return results;
}

function generateReport(results: TestResult[]) {
    console.log('📊 Step 3: Test Report\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Summary statistics
    const total = results.length;
    const autoApply = results.filter(r => r.category === 'auto_apply').length;
    const needsReview = results.filter(r => r.category === 'needs_review').length;
    const failed = results.filter(r => r.category === 'failed').length;
    const cacheHits = results.filter(r => r.cacheHit).length;

    console.log('📈 SUMMARY STATISTICS');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`   Test Campaigns: ${total}`);
    console.log(`   Patches Generated: ${results.filter(r => Object.keys(r.patch).length > 0).length}`);
    console.log();
    console.log('   CONFIDENCE DISTRIBUTION:');
    console.log(`   ✅ Auto-Apply (≥0.80):     ${autoApply} (${((autoApply / total) * 100).toFixed(1)}%)`);
    console.log(`   ⚠️  Needs Review (0.55-0.79): ${needsReview} (${((needsReview / total) * 100).toFixed(1)}%)`);
    console.log(`   ❌ Failed (<0.55):         ${failed} (${((failed / total) * 100).toFixed(1)}%)`);
    console.log();
    console.log(`   🔄 Cache Hit Rate: ${cacheHits}/${total} (${((cacheHits / total) * 100).toFixed(1)}%)`);
    console.log();

    // Field frequency
    const fieldCounts: Record<string, number> = {};
    results.forEach(r => {
        Object.keys(r.patch).forEach(field => {
            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        });
    });

    console.log('🔧 MOST FREQUENTLY FIXED FIELDS');
    console.log('─────────────────────────────────────────────────────────');
    Object.entries(fieldCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([field, count]) => {
            console.log(`   ${field}: ${count} times (${((count / total) * 100).toFixed(1)}%)`);
        });
    console.log();

    // Data consistency checks
    console.log('✓ DATA CONSISTENCY CHECKS');
    console.log('─────────────────────────────────────────────────────────');

    const autoApplyResults = results.filter(r => r.category === 'auto_apply');
    let dateIssues = 0;
    let installmentIssues = 0;
    let cardIssues = 0;

    autoApplyResults.forEach(r => {
        // Date logic check
        if (r.patch.valid_from && r.patch.valid_until) {
            if (r.patch.valid_from >= r.patch.valid_until) {
                dateIssues++;
            }
        }

        // Installment check
        if (r.patch.discount && !r.patch.discount.includes('Taksit')) {
            installmentIssues++;
        }

        // Eligible cards check
        if (r.patch.eligible_cards && r.patch.eligible_cards.length === 0) {
            cardIssues++;
        }
    });

    console.log(`   Date Logic (valid_from < valid_until): ${autoApplyResults.length - dateIssues}/${autoApplyResults.length} ✓`);
    console.log(`   Installment Format: ${autoApplyResults.length - installmentIssues}/${autoApplyResults.length} ✓`);
    console.log(`   Eligible Cards Non-Empty: ${autoApplyResults.length - cardIssues}/${autoApplyResults.length} ✓`);

    if (dateIssues > 0) console.log(`   ⚠️  ${dateIssues} date logic issues found`);
    if (installmentIssues > 0) console.log(`   ⚠️  ${installmentIssues} installment format issues found`);
    if (cardIssues > 0) console.log(`   ⚠️  ${cardIssues} empty card array issues found`);

    console.log();

    // Edge cases and risks
    console.log('⚠️  OBSERVED RISKS & EDGE CASES');
    console.log('─────────────────────────────────────────────────────────');

    const lowConfidenceButPatched = results.filter(r => r.confidence < 0.60 && Object.keys(r.patch).length > 0);
    if (lowConfidenceButPatched.length > 0) {
        console.log(`   • ${lowConfidenceButPatched.length} campaigns have patches despite low confidence`);
    }

    if (cacheHits < total * 0.8) {
        console.log(`   • Cache hit rate is low (${((cacheHits / total) * 100).toFixed(1)}%) - investigate caching logic`);
    }

    const multipleIssues = results.filter(r => r.issues.length > 3);
    if (multipleIssues.length > 0) {
        console.log(`   • ${multipleIssues.length} campaigns have >3 issues - may need complex fixes`);
    }

    console.log();
    console.log('═══════════════════════════════════════════════════════════\n');

    // Final decision
    console.log('🎯 READINESS ASSESSMENT\n');

    const readyForApi = autoApply > 0 && cacheHits >= total * 0.5 && dateIssues === 0;

    if (readyForApi) {
        console.log('✅ YES - Ready to proceed with API + Admin UI');
        console.log();
        console.log('Reasons:');
        console.log(`   • ${autoApply} campaigns can be auto-fixed with high confidence`);
        console.log(`   • Cache is working (${((cacheHits / total) * 100).toFixed(1)}% hit rate)`);
        console.log('   • No critical data consistency issues');
        console.log('   • AI patch generation is functional');
    } else {
        console.log('❌ NO - Issues need to be resolved first');
        console.log();
        console.log('Blockers:');
        if (autoApply === 0) console.log('   • No high-confidence patches generated');
        if (cacheHits < total * 0.5) console.log('   • Cache not working properly');
        if (dateIssues > 0) console.log('   • Date logic issues in patches');
    }

    console.log();
}

async function main() {
    console.log('🚀 AI Auto-Fix System - DRY RUN TEST\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Step 1: Verify DB schema
    const schemaOk = await verifyDatabaseSchema();
    if (!schemaOk) {
        console.log('❌ Database schema verification failed. Aborting tests.');
        process.exit(1);
    }

    // Step 2: Run dry-run tests
    const results = await runDryRunTests();

    if (results.length === 0) {
        console.log('❌ No test results. Aborting.');
        process.exit(1);
    }

    // Step 3: Generate report
    generateReport(results);
}

main().catch(console.error);
