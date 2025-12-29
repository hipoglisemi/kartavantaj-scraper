import { supabase } from '../src/utils/supabase';
import * as fs from 'fs';

/**
 * Fix ONLY the safe mathematical calculation errors
 * Applies fixes for PERCENTAGE_MIN_SPEND_ERROR and first 4 TIERED_MIN_SPEND_ERROR
 */

const SAFE_FIX_IDS = [
    // PERCENTAGE_MIN_SPEND_ERROR - All 6 are safe
    14888, 14755, 14747, 14746, 14745, 14713,
    // TIERED_MIN_SPEND_ERROR - Only first 4 are safe
    14759, 14758, 14757, 14752
];

interface ValidationIssue {
    id: number;
    title: string;
    issue_type: string;
    details: string;
    current_values: any;
    suggested_fix?: any;
}

interface ValidationReport {
    timestamp: string;
    total_campaigns: number;
    total_issues: number;
    all_issues: ValidationIssue[];
}

async function applySafeFixes(dryRun: boolean = true) {
    console.log('📖 Reading validation report...\n');

    const reportPath = './output/math_validation_report.json';

    if (!fs.existsSync(reportPath)) {
        console.error('❌ Validation report not found. Please run validate_campaign_math.ts first.');
        return;
    }

    const report: ValidationReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

    // Filter only safe fixes
    const safeFixes = report.all_issues.filter(issue =>
        SAFE_FIX_IDS.includes(issue.id) && issue.suggested_fix
    );

    console.log(`🔧 Applying ${safeFixes.length} safe fixes:\n`);

    safeFixes.forEach((issue, idx) => {
        console.log(`${idx + 1}. ID ${issue.id}: "${issue.title}"`);
        console.log(`   ${issue.issue_type}`);
        console.log(`   Current min_spend: ${issue.current_values.min_spend} TL`);
        console.log(`   New min_spend: ${issue.suggested_fix.min_spend} TL`);
        console.log(`   Calculation: ${issue.current_values.calculation}\n`);
    });

    if (dryRun) {
        console.log('🔒 DRY RUN MODE - No changes made to database.');
        console.log('   Run with --execute flag to apply fixes.\n');
        return;
    }

    // Execute fixes
    console.log('💾 Applying fixes to database...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const issue of safeFixes) {
        const { error } = await supabase
            .from('campaigns')
            .update({ min_spend: issue.suggested_fix.min_spend })
            .eq('id', issue.id);

        if (error) {
            console.error(`❌ Error fixing ID ${issue.id}:`, error.message);
            errorCount++;
        } else {
            console.log(`✅ Fixed ID ${issue.id}: ${issue.current_values.min_spend} → ${issue.suggested_fix.min_spend} TL`);
            successCount++;
        }
    }

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`✅ Fix complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (dryRun) {
    console.log('🔍 Running in DRY RUN mode...\n');
} else {
    console.log('⚡ Running in EXECUTE mode...\n');
}

applySafeFixes(dryRun)
    .then(() => {
        console.log('✨ Script finished.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });
