/**
 * Analyze WorldCard Campaigns - Find Missing Fields
 * Reports which columns are empty/null in parsed campaigns
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

// Critical fields to check
const CRITICAL_FIELDS = [
    'title',
    'description',
    'category',
    'badge_text',
    'badge_color',
    'discount',
    'earning',
    'min_spend',
    'max_discount',
    'discount_percentage',
    'valid_from',
    'valid_until',
    'participation_method',
    'participation_points',
    'conditions',
    'eligible_customers',
    'valid_locations',
    'merchant',
    'difficulty_level',
    'bank',
    'brand',
    'ai_enhanced'
];

interface FieldStats {
    field: string;
    total: number;
    filled: number;
    empty: number;
    percentage: number;
}

interface CampaignIssue {
    id: number;
    title: string;
    ai_enhanced: boolean;
    missing_fields: string[];
}

function isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
}

async function analyzeCampaigns() {
    console.log('\n🔍 Analyzing WorldCard Campaigns...\n');
    console.log('='.repeat(80));

    // Fetch all WorldCard campaigns
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('provider', 'World Card (Yapı Kredi)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching campaigns:', error);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('⚠️  No campaigns found');
        return;
    }

    console.log(`📊 Total Campaigns: ${campaigns.length}\n`);

    // Field-level statistics
    const fieldStats: FieldStats[] = [];
    const campaignIssues: CampaignIssue[] = [];

    // Analyze each field
    CRITICAL_FIELDS.forEach(field => {
        let filled = 0;
        let empty = 0;

        campaigns.forEach(campaign => {
            if (isEmpty(campaign[field])) {
                empty++;
            } else {
                filled++;
            }
        });

        fieldStats.push({
            field,
            total: campaigns.length,
            filled,
            empty,
            percentage: Math.round((filled / campaigns.length) * 100)
        });
    });

    // Sort by % filled (ascending - worst first)
    fieldStats.sort((a, b) => a.percentage - b.percentage);

    // Print field statistics
    console.log('\n📋 FIELD COMPLETION STATISTICS\n');
    console.log('─'.repeat(80));
    console.log(`${'Field'.padEnd(25)} ${'Filled'.padStart(8)} ${'Empty'.padStart(8)} ${'%'.padStart(8)}`);
    console.log('─'.repeat(80));

    fieldStats.forEach(stat => {
        const barLength = Math.floor(stat.percentage / 5);
        const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
        const icon = stat.percentage >= 80 ? '✅' : stat.percentage >= 50 ? '⚠️' : '❌';

        console.log(
            `${icon} ${stat.field.padEnd(22)} ` +
            `${String(stat.filled).padStart(6)} ` +
            `${String(stat.empty).padStart(6)} ` +
            `${String(stat.percentage + '%').padStart(6)} ${bar}`
        );
    });

    console.log('─'.repeat(80));

    // Find campaigns with missing critical fields
    campaigns.forEach(campaign => {
        const missing: string[] = [];

        // Check critical fields only
        ['category', 'valid_until', 'badge_text', 'description', 'bank'].forEach(field => {
            if (isEmpty(campaign[field])) {
                missing.push(field);
            }
        });

        if (missing.length > 0) {
            campaignIssues.push({
                id: campaign.id,
                title: campaign.title,
                ai_enhanced: campaign.ai_enhanced || false,
                missing_fields: missing
            });
        }
    });

    // Group by AI Enhanced vs Non-AI
    const aiEnhanced = campaigns.filter(c => c.ai_enhanced === true).length;
    const nonAI = campaigns.filter(c => c.ai_enhanced !== true).length;

    console.log('\n\n🤖 AI ENHANCEMENT STATUS\n');
    console.log('─'.repeat(80));
    console.log(`✅ AI Enhanced:     ${aiEnhanced} campaigns (${Math.round(aiEnhanced / campaigns.length * 100)}%)`);
    console.log(`❌ Not Enhanced:    ${nonAI} campaigns (${Math.round(nonAI / campaigns.length * 100)}%)`);

    // Print campaigns with issues
    console.log('\n\n⚠️  CAMPAIGNS WITH MISSING CRITICAL FIELDS\n');
    console.log('─'.repeat(80));

    if (campaignIssues.length === 0) {
        console.log('✅ All campaigns have critical fields filled!');
    } else {
        console.log(`Found ${campaignIssues.length} campaigns with issues:\n`);

        // Sort: Non-AI first, then by number of missing fields
        campaignIssues.sort((a, b) => {
            if (a.ai_enhanced !== b.ai_enhanced) {
                return a.ai_enhanced ? 1 : -1;
            }
            return b.missing_fields.length - a.missing_fields.length;
        });

        campaignIssues.forEach((issue, index) => {
            const aiStatus = issue.ai_enhanced ? '🤖' : '❌';
            console.log(`${index + 1}. ${aiStatus} ${issue.title}`);
            console.log(`   Missing: ${issue.missing_fields.join(', ')}`);
            console.log('');
        });
    }

    // Generate SQL to fix campaigns
    console.log('\n\n💡 RECOMMENDED ACTIONS\n');
    console.log('─'.repeat(80));

    const worstFields = fieldStats.filter(s => s.percentage < 80);
    if (worstFields.length > 0) {
        console.log('Fields needing attention (< 80% filled):');
        worstFields.forEach(field => {
            console.log(`  • ${field.field}: ${field.percentage}% filled`);
        });
    }

    console.log(`\n📝 Campaigns needing AI re-parsing: ${nonAI}`);
    console.log(`📝 Campaigns with missing critical fields: ${campaignIssues.length}`);

    // SQL Query for campaigns needing AI parsing
    console.log('\n\n📊 SQL: Campaigns WITHOUT AI Enhancement\n');
    console.log('─'.repeat(80));
    console.log(`
SELECT 
    id,
    title,
    url,
    ai_enhanced,
    category,
    valid_until,
    badge_text
FROM campaigns 
WHERE provider = 'World Card (Yapı Kredi)' 
  AND (ai_enhanced IS NULL OR ai_enhanced = false)
ORDER BY created_at DESC;
    `.trim());

    console.log('\n\n📊 SQL: Campaigns with NULL Critical Fields\n');
    console.log('─'.repeat(80));
    console.log(`
SELECT 
    id,
    title,
    ai_enhanced,
    CASE WHEN category IS NULL THEN 'category,' ELSE '' END ||
    CASE WHEN valid_until IS NULL THEN 'valid_until,' ELSE '' END ||
    CASE WHEN badge_text IS NULL THEN 'badge_text,' ELSE '' END ||
    CASE WHEN description IS NULL THEN 'description,' ELSE '' END ||
    CASE WHEN bank IS NULL THEN 'bank,' ELSE '' END as missing_fields
FROM campaigns 
WHERE provider = 'World Card (Yapı Kredi)'
  AND (
    category IS NULL OR
    valid_until IS NULL OR
    badge_text IS NULL OR
    description IS NULL OR
    bank IS NULL
  )
ORDER BY ai_enhanced ASC, created_at DESC;
    `.trim());

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ Analysis complete!\n');
}

analyzeCampaigns().catch(console.error);
