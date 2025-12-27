// scripts/audit_campaign_quality.ts
// Quality Audit Script: Compares DB values vs deterministic extraction

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseDates, extractMathDetails, extractValidCards, extractJoinMethod, extractSpendChannel, extractDiscount } from '../src/utils/dataExtractor';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

interface AuditIssue {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
}

interface AuditResult {
    campaign_id: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    issues: string[];
    diff: Record<string, any>;
    clean_text_snippet: string;
}

// Parse CLI arguments
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const LIMIT = limitIndex !== -1 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1]) : 200;

console.log(`🔍 Starting Quality Audit for last ${LIMIT} campaigns...\\n`);

async function fetchCampaigns(limit: number) {
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, description, valid_from, valid_until, min_spend, earning, discount, max_discount, discount_percentage, eligible_cards, participation_method, spend_channel, spend_channel_detail, required_spend_for_max_benefit, brand')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('❌ Error fetching campaigns:', error);
        process.exit(1);
    }

    return data || [];
}

function detectIssues(campaign: any, expected: any): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const cleanText = campaign.description || '';

    // === DATE VALIDATION ===

    // Year mismatch
    if (campaign.valid_until && expected.valid_until) {
        const dbYear = campaign.valid_until.substring(0, 4);
        const expectedYear = expected.valid_until.substring(0, 4);
        if (dbYear !== expectedYear) {
            issues.push({
                type: 'date_year_mismatch',
                severity: 'HIGH',
                message: `Year mismatch: DB=${dbYear}, Expected=${expectedYear}`
            });
        }
    }

    // Date order invalid
    if (campaign.valid_from && campaign.valid_until) {
        if (campaign.valid_from > campaign.valid_until) {
            issues.push({
                type: 'date_order_invalid',
                severity: 'HIGH',
                message: `valid_from (${campaign.valid_from}) > valid_until (${campaign.valid_until})`
            });
        }
    }

    // Date range parse bug (check for "1-31" pattern in text)
    const rangePattern = /(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)/i;
    const rangeMatch = cleanText.match(rangePattern);
    if (rangeMatch) {
        const startDay = parseInt(rangeMatch[1]);
        const endDay = parseInt(rangeMatch[2]);

        // Check for invalid "31-31" pattern
        if (startDay === endDay) {
            issues.push({
                type: 'date_day_range_invalid',
                severity: 'HIGH',
                message: `Invalid day range: ${startDay}-${endDay} ${rangeMatch[3]}`
            });
        }

        // Check if DB dates match expected range
        if (campaign.valid_from && expected.valid_from) {
            const dbFromDay = parseInt(campaign.valid_from.substring(8, 10));
            if (dbFromDay !== startDay) {
                issues.push({
                    type: 'date_range_parse_bug',
                    severity: 'HIGH',
                    message: `Range start mismatch: Text=${startDay}, DB=${dbFromDay}`
                });
            }
        }
    }

    // === ELIGIBLE CARDS VALIDATION ===

    const textLower = cleanText.toLowerCase();
    const cardKeywords = ['axess', 'wings', 'free', 'akbank kart', 'neo'];

    for (const card of cardKeywords) {
        if (textLower.includes(card)) {
            const index = textLower.indexOf(card);
            const context = textLower.substring(index, index + 60);

            // Check for negative context
            const hasNegative = context.includes('dahil değil') || context.includes('geçerli değil');

            if (!hasNegative) {
                // Card should be in eligible_cards
                const dbCards = campaign.eligible_cards || [];
                const hasCard = dbCards.some((c: string) => c.toLowerCase() === card);

                if (!hasCard) {
                    issues.push({
                        type: 'eligible_cards_missing',
                        severity: 'MEDIUM',
                        message: `Card "${card}" mentioned but not in eligible_cards`
                    });
                }
            } else {
                // Card should NOT be in eligible_cards
                const dbCards = campaign.eligible_cards || [];
                const hasCard = dbCards.some((c: string) => c.toLowerCase() === card);

                if (hasCard) {
                    issues.push({
                        type: 'eligible_cards_false_positive',
                        severity: 'MEDIUM',
                        message: `Card "${card}" has negative context but included`
                    });
                }
            }
        }
    }

    // === PARTICIPATION METHOD VALIDATION ===

    // SMS signals
    const smsSignals = ['sms', 'kayıt', 'katıl', 'gönder', 'mesaj', 'kısa mesaj'];
    const hasSmsSignal = smsSignals.some(s => textLower.includes(s)) || /\\d{4}['']?e\\s+(sms|gönder)/i.test(cleanText);

    if (hasSmsSignal && campaign.participation_method !== 'SMS') {
        issues.push({
            type: 'participation_sms_missed',
            severity: 'MEDIUM',
            message: `SMS signals found but participation_method=${campaign.participation_method}`
        });
    }

    // Juzdan/App signals
    const appSignals = ['juzdan', 'mobil uygulama', 'akbank mobil'];
    const hasAppSignal = appSignals.some(s => textLower.includes(s));

    if (hasAppSignal && !campaign.participation_method) {
        issues.push({
            type: 'participation_app_missed',
            severity: 'MEDIUM',
            message: `App signals found but participation_method is null`
        });
    }

    // AUTO signals
    const autoSignals = ['otomatik', 'başvuru gerekmez', 'katılım gerekmez'];
    const hasAutoSignal = autoSignals.some(s => textLower.includes(s));

    if (hasAutoSignal && campaign.participation_method !== 'AUTO') {
        issues.push({
            type: 'participation_auto_missed',
            severity: 'MEDIUM',
            message: `AUTO signals found but participation_method=${campaign.participation_method}`
        });
    }

    // === MATH VALIDATION ===

    // Taksit in text but discount null
    if (/taksit/i.test(cleanText) && !campaign.discount) {
        issues.push({
            type: 'discount_missing_taksit',
            severity: 'HIGH',
            message: `"Taksit" found in text but discount is null`
        });
    }

    // Min spend signals but min_spend=0
    const spendSignals = ['üzeri', 'en az', 'harcamaya', 'tutarında'];
    const hasSpendSignal = spendSignals.some(s => textLower.includes(s)) && /\\d+/.test(cleanText);

    if (hasSpendSignal && campaign.min_spend === 0) {
        issues.push({
            type: 'spend_zero_with_signals',
            severity: 'MEDIUM',
            message: `Spend signals found but min_spend=0`
        });
    }

    // Percentage signals but discount_percentage null
    if (/%|yüzde/.test(cleanText) && !campaign.discount_percentage) {
        issues.push({
            type: 'percent_missing',
            severity: 'MEDIUM',
            message: `Percentage signals found but discount_percentage is null`
        });
    }

    // Cap signals but max_discount null
    const capSignals = ['en fazla', 'max', 'toplam', 'varan', 'kadar'];
    const hasCapSignal = capSignals.some(s => textLower.includes(s)) && /\\d+\\s*tl/i.test(cleanText);

    if (hasCapSignal && !campaign.max_discount) {
        issues.push({
            type: 'cap_missing',
            severity: 'MEDIUM',
            message: `Cap signals found but max_discount is null`
        });
    }

    // Required spend invalid
    if (campaign.required_spend_for_max_benefit !== null) {
        if (campaign.required_spend_for_max_benefit <= 0 ||
            campaign.required_spend_for_max_benefit < (campaign.min_spend || 0)) {
            issues.push({
                type: 'required_spend_invalid',
                severity: 'HIGH',
                message: `required_spend_for_max_benefit=${campaign.required_spend_for_max_benefit} is invalid`
            });
        }
    }

    // === LEGAL TEXT VALIDATION ===

    const legalPatterns = [
        /banka.*?saklı\\s+tutar/i,
        /mevzuat/i,
        /bsmv|kkdf/i,
        /tek\\s+taraflı/i,
        /kampanyayı\\s+durdurma/i
    ];

    let legalCount = 0;
    for (const pattern of legalPatterns) {
        if (pattern.test(cleanText)) {
            legalCount++;
        }
    }

    if (legalCount >= 2) {
        issues.push({
            type: 'legal_text_not_filtered',
            severity: 'LOW',
            message: `${legalCount} legal boilerplate patterns found in text`
        });
    }

    return issues;
}

function calculateSeverity(issues: AuditIssue[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (issues.some(i => i.severity === 'HIGH')) return 'HIGH';
    if (issues.some(i => i.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
}

function buildDiff(campaign: any, expected: any): Record<string, any> {
    const diff: Record<string, any> = {};

    const fieldsToCompare = [
        'valid_from',
        'valid_until',
        'min_spend',
        'earning',
        'discount',
        'max_discount',
        'discount_percentage',
        'eligible_cards',
        'participation_method',
        'spend_channel'
    ];

    for (const field of fieldsToCompare) {
        const dbValue = campaign[field];
        const expectedValue = expected[field];

        if (JSON.stringify(dbValue) !== JSON.stringify(expectedValue)) {
            diff[field] = {
                db: dbValue,
                expected: expectedValue
            };
        }
    }

    return diff;
}

async function auditCampaign(campaign: any): Promise<AuditResult | null> {
    const cleanText = campaign.description || '';

    if (!cleanText || cleanText.length < 50) {
        return null; // Skip campaigns without sufficient text
    }

    // Re-run deterministic extractors
    const dateResult = parseDates(cleanText);
    const mathResult = extractMathDetails(campaign.title || '', cleanText);
    const cards = extractValidCards(cleanText);
    const participationMethod = extractJoinMethod(cleanText);
    const spendChannelResult = extractSpendChannel(cleanText, campaign.brand);
    const discount = extractDiscount(campaign.title || '', cleanText);

    const expected = {
        valid_from: dateResult.valid_from,
        valid_until: dateResult.valid_until,
        min_spend: mathResult.min_spend,
        earning: mathResult.earning,
        discount: discount,
        max_discount: mathResult.max_discount,
        discount_percentage: mathResult.discount_percentage,
        eligible_cards: cards,
        participation_method: participationMethod,
        spend_channel: spendChannelResult.channel
    };

    // Detect issues
    const issues = detectIssues(campaign, expected);

    if (issues.length === 0) {
        return null; // No issues found
    }

    // Build diff
    const diff = buildDiff(campaign, expected);

    // Calculate severity
    const severity = calculateSeverity(issues);

    return {
        campaign_id: campaign.id,
        severity,
        issues: issues.map(i => i.type),
        diff,
        clean_text_snippet: cleanText.substring(0, 500)
    };
}

async function saveAuditResults(results: AuditResult[]) {
    console.log(`\n💾 Saving ${results.length} audit results...`);

    for (const result of results) {
        // Insert or update audit result
        const { error: auditError } = await supabase
            .from('campaign_quality_audits')
            .insert({
                campaign_id: result.campaign_id,
                severity: result.severity,
                issues: result.issues,
                diff: result.diff,
                clean_text_snippet: result.clean_text_snippet,
                source: 'audit_script',
                created_at: new Date().toISOString()
            });

        if (auditError) {
            // If insert fails (duplicate), try update
            if (auditError.code === '23505') {
                const { error: updateError } = await supabase
                    .from('campaign_quality_audits')
                    .update({
                        severity: result.severity,
                        issues: result.issues,
                        diff: result.diff,
                        clean_text_snippet: result.clean_text_snippet,
                        created_at: new Date().toISOString()
                    })
                    .eq('campaign_id', result.campaign_id);

                if (updateError) {
                    console.error(`   ❌ Error updating audit for campaign ${result.campaign_id}:`, updateError);
                }
            } else {
                console.error(`   ❌ Error saving audit for campaign ${result.campaign_id}:`, auditError);
            }
        }

        // Update needs_manual_fix flag for HIGH severity
        if (result.severity === 'HIGH') {
            const { error: updateError } = await supabase
                .from('campaigns')
                .update({ needs_manual_fix: true })
                .eq('id', result.campaign_id);

            if (updateError) {
                console.error(`   ❌ Error updating needs_manual_fix for campaign ${result.campaign_id}:`, updateError);
            }
        }
    }

    console.log('✅ Audit results saved successfully!');
}

async function main() {
    const campaigns = await fetchCampaigns(LIMIT);
    console.log(`📊 Fetched ${campaigns.length} campaigns\\n`);

    const results: AuditResult[] = [];
    let processed = 0;

    for (const campaign of campaigns) {
        processed++;
        if (processed % 10 === 0) {
            console.log(`   Progress: ${processed}/${campaigns.length}`);
        }

        const auditResult = await auditCampaign(campaign);
        if (auditResult) {
            results.push(auditResult);
        }
    }

    console.log(`\\n🔍 Audit Complete!`);
    console.log(`   Total Campaigns: ${campaigns.length}`);
    console.log(`   Issues Found: ${results.length}`);
    console.log(`   HIGH Severity: ${results.filter(r => r.severity === 'HIGH').length}`);
    console.log(`   MEDIUM Severity: ${results.filter(r => r.severity === 'MEDIUM').length}`);
    console.log(`   LOW Severity: ${results.filter(r => r.severity === 'LOW').length}`);

    if (results.length > 0) {
        await saveAuditResults(results);
    } else {
        console.log('\\n✅ No issues found!');
    }
}

main().catch(console.error);
