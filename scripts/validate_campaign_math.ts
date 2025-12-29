import { supabase } from '../src/utils/supabase';

/**
 * Validates mathematical calculations in campaigns by checking:
 * 1. min_spend calculation for tiered/percentage campaigns
 * 2. max_discount vs earning consistency
 * 3. Percentage extraction accuracy
 * 
 * This script analyzes campaigns to find AI calculation errors.
 */

interface Campaign {
    id: number;
    title: string;
    earning: string | null;
    discount: string | null;
    min_spend: number | null;
    max_discount: number | null;
    discount_percentage: number | null;
    description: string | null;
    conditions: string[] | null;
}

interface ValidationIssue {
    id: number;
    title: string;
    issue_type: string;
    details: string;
    current_values: any;
    suggested_fix?: any;
}

const issues: ValidationIssue[] = [];

/**
 * Check if earning and max_discount are consistent
 */
function validateEarningMaxDiscount(campaign: Campaign) {
    const { id, title, earning, max_discount, discount_percentage } = campaign;

    if (!earning || !max_discount) return;

    // Check percentage campaigns
    const percentMatch = earning.match(/%(\d+(\.\d+)?)/);
    if (percentMatch) {
        const percentage = parseFloat(percentMatch[1]);

        // Check if earning has max limit format
        const maxInEarning = earning.match(/max\s+(\d+)/i);

        if (!maxInEarning) {
            // Missing max limit in earning for percentage campaign
            issues.push({
                id,
                title,
                issue_type: 'MISSING_MAX_IN_EARNING',
                details: `Percentage campaign has max_discount=${max_discount} but earning doesn't show it`,
                current_values: { earning, max_discount, discount_percentage },
                suggested_fix: { earning: `%${percentage} (max ${max_discount}TL)` }
            });
        } else {
            const maxInEarningValue = parseInt(maxInEarning[1]);
            if (maxInEarningValue !== max_discount) {
                issues.push({
                    id,
                    title,
                    issue_type: 'MAX_MISMATCH',
                    details: `Earning shows max ${maxInEarningValue}TL but max_discount is ${max_discount}TL`,
                    current_values: { earning, max_discount }
                });
            }
        }

        // Validate discount_percentage
        if (discount_percentage && discount_percentage !== percentage) {
            issues.push({
                id,
                title,
                issue_type: 'PERCENTAGE_MISMATCH',
                details: `Earning shows %${percentage} but discount_percentage is ${discount_percentage}`,
                current_values: { earning, discount_percentage }
            });
        }
    }

    // Check fixed amount campaigns
    const amountMatch = earning.match(/(\d+)\s*TL/);
    if (amountMatch && !percentMatch) {
        const earningAmount = parseInt(amountMatch[1]);

        if (max_discount && earningAmount !== max_discount) {
            issues.push({
                id,
                title,
                issue_type: 'FIXED_AMOUNT_MISMATCH',
                details: `Earning shows ${earningAmount}TL but max_discount is ${max_discount}TL`,
                current_values: { earning, max_discount }
            });
        }
    }
}

/**
 * Validate min_spend for tiered campaigns
 * Pattern: "her X TL'ye Y TL, toplam Z TL" -> min_spend should be (Z/Y)*X
 */
function validateMinSpendCalculation(campaign: Campaign) {
    const { id, title, min_spend, max_discount, earning, description, conditions } = campaign;

    if (!description && !conditions) return;

    const fullText = [title, description, ...(conditions || [])].join(' ');

    // Pattern 1: "her X TL harcamaya Y TL, toplam Z TL"
    const tieredPattern = /her\s+(\d+(?:\.\d+)?)\s*TL.*?(\d+(?:\.\d+)?)\s*TL.*?toplam.*?(\d+(?:\.\d+)?)\s*TL/i;
    const match = fullText.match(tieredPattern);

    if (match) {
        const perSpend = parseFloat(match[1]);
        const perReward = parseFloat(match[2]);
        const totalReward = parseFloat(match[3]);

        const calculatedMinSpend = (totalReward / perReward) * perSpend;

        if (min_spend && Math.abs(min_spend - calculatedMinSpend) > 1) {
            issues.push({
                id,
                title,
                issue_type: 'TIERED_MIN_SPEND_ERROR',
                details: `Tiered campaign: "her ${perSpend}TL'ye ${perReward}TL, toplam ${totalReward}TL"`,
                current_values: {
                    min_spend,
                    calculation: `(${totalReward}/${perReward})*${perSpend} = ${calculatedMinSpend}`
                },
                suggested_fix: { min_spend: calculatedMinSpend }
            });
        }
    }

    // Pattern 2: Percentage with max limit -> min_spend should be max_discount / percentage
    const percentMatch = earning?.match(/%(\d+(\.\d+)?)/);
    if (percentMatch && max_discount) {
        const percentage = parseFloat(percentMatch[1]) / 100;
        const calculatedMinSpend = Math.round(max_discount / percentage);

        if (min_spend && Math.abs(min_spend - calculatedMinSpend) > 1) {
            issues.push({
                id,
                title,
                issue_type: 'PERCENTAGE_MIN_SPEND_ERROR',
                details: `Percentage campaign with max limit`,
                current_values: {
                    min_spend,
                    earning,
                    max_discount,
                    calculation: `${max_discount} / ${percentage} = ${calculatedMinSpend}`
                },
                suggested_fix: { min_spend: calculatedMinSpend }
            });
        }
    }
}

/**
 * Check for campaigns with suspiciously high min_spend
 */
function validateReasonableMinSpend(campaign: Campaign) {
    const { id, title, min_spend, max_discount } = campaign;

    if (!min_spend || !max_discount) return;

    // If min_spend is more than 100x max_discount, likely an error
    if (min_spend > max_discount * 100) {
        issues.push({
            id,
            title,
            issue_type: 'UNREASONABLE_MIN_SPEND',
            details: `min_spend (${min_spend}TL) is ${Math.round(min_spend / max_discount)}x the max_discount (${max_discount}TL)`,
            current_values: { min_spend, max_discount }
        });
    }

    // If min_spend is less than max_discount for non-percentage campaigns, likely wrong
    const isPercentage = campaign.earning?.includes('%');
    if (!isPercentage && min_spend < max_discount) {
        issues.push({
            id,
            title,
            issue_type: 'MIN_SPEND_TOO_LOW',
            details: `min_spend (${min_spend}TL) is less than max_discount (${max_discount}TL) for fixed reward`,
            current_values: { min_spend, max_discount, earning: campaign.earning }
        });
    }
}

async function validateAllCampaigns() {
    console.log('🔍 Fetching all campaigns for math validation...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, earning, discount, min_spend, max_discount, discount_percentage, description, conditions')
        .not('earning', 'is', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching campaigns:', error);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No campaigns found.');
        return;
    }

    console.log(`📊 Validating ${campaigns.length} campaigns...\n`);

    for (const campaign of campaigns as Campaign[]) {
        validateEarningMaxDiscount(campaign);
        validateMinSpendCalculation(campaign);
        validateReasonableMinSpend(campaign);
    }

    // Group issues by type
    const issuesByType = issues.reduce((acc, issue) => {
        if (!acc[issue.issue_type]) {
            acc[issue.issue_type] = [];
        }
        acc[issue.issue_type].push(issue);
        return acc;
    }, {} as Record<string, ValidationIssue[]>);

    // Print summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 VALIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (issues.length === 0) {
        console.log('✅ No mathematical errors found! All campaigns are valid.\n');
        return;
    }

    console.log(`❌ Found ${issues.length} issues across ${Object.keys(issuesByType).length} categories:\n`);

    for (const [type, typeIssues] of Object.entries(issuesByType)) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🔴 ${type} (${typeIssues.length} campaigns)`);
        console.log('='.repeat(60));

        typeIssues.slice(0, 5).forEach((issue, idx) => {
            console.log(`\n${idx + 1}. ID ${issue.id}: "${issue.title}"`);
            console.log(`   Issue: ${issue.details}`);
            console.log(`   Current: ${JSON.stringify(issue.current_values, null, 2)}`);
            if (issue.suggested_fix) {
                console.log(`   Suggested Fix: ${JSON.stringify(issue.suggested_fix, null, 2)}`);
            }
        });

        if (typeIssues.length > 5) {
            console.log(`\n   ... and ${typeIssues.length - 5} more`);
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`📋 Total Issues: ${issues.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Export detailed report
    const reportPath = './output/math_validation_report.json';
    const fs = require('fs');
    const path = require('path');

    const outputDir = path.dirname(reportPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        total_campaigns: campaigns.length,
        total_issues: issues.length,
        issues_by_type: Object.entries(issuesByType).map(([type, issues]) => ({
            type,
            count: issues.length,
            examples: issues.slice(0, 3)
        })),
        all_issues: issues
    }, null, 2));

    console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

validateAllCampaigns()
    .then(() => {
        console.log('✨ Validation complete.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });
