import { supabase } from '../src/utils/supabase';

/**
 * Fix manual campaign math issues identified in validation
 * Categories:
 * 1. FIXED_AMOUNT_MISMATCH: Sync earning with max_discount
 * 2. MIN_SPEND_TOO_LOW (Taksit): Set earning and discount to taksit info
 * 3. MIN_SPEND_TOO_LOW (Başvuru): Remove min_spend
 */

interface Campaign {
    id: number;
    title: string;
    earning: string | null;
    discount: string | null;
    min_spend: number | null;
    max_discount: number | null;
    description: string | null;
    conditions: string[] | null;
}

interface Fix {
    id: number;
    title: string;
    description: string;
    category: string;
    current: any;
    updates: any;
    reason: string;
}

const fixes: Fix[] = [];

// Category 1: FIXED_AMOUNT_MISMATCH - Sync earning with max_discount
const FIXED_AMOUNT_IDS = [14759, 14758, 14757, 14752, 14749, 14730, 14728, 14724, 14709, 14676, 14579, 14527];

// Category 2a: Taksit campaigns
const TAKSIT_IDS = [14790, 14716];

// Category 2b: Başvuru campaigns
const BASVURU_IDS = [14883, 14674, 14661];

async function fetchCampaignDetails(ids: number[]): Promise<Campaign[]> {
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, earning, discount, min_spend, max_discount, description, conditions')
        .in('id', ids);

    if (error) {
        console.error('Error fetching campaigns:', error);
        return [];
    }

    return data as Campaign[];
}

async function generateFixReport(dryRun: boolean = true) {
    console.log('📖 Fetching campaign details...\n');

    // Fetch all campaigns that need fixing
    const allIds = [...FIXED_AMOUNT_IDS, ...TAKSIT_IDS, ...BASVURU_IDS];
    const campaigns = await fetchCampaignDetails(allIds);

    if (campaigns.length === 0) {
        console.log('❌ No campaigns found.');
        return;
    }

    console.log(`✅ Fetched ${campaigns.length} campaigns\n`);

    // Category 1: FIXED_AMOUNT_MISMATCH
    for (const campaign of campaigns.filter(c => FIXED_AMOUNT_IDS.includes(c.id))) {
        if (!campaign.max_discount) continue;

        // Determine if it's Puan or İndirim based on title
        const titleLower = campaign.title.toLowerCase();
        const isPuan = titleLower.includes('puan') ||
            titleLower.includes('chip-para') ||
            titleLower.includes('worldpuan') ||
            titleLower.includes('mil');

        const isIndirim = titleLower.includes('indirim') ||
            titleLower.includes('iade');

        let suffix = 'TL Puan'; // Default
        if (isIndirim && !isPuan) {
            suffix = 'TL İndirim';
        } else if (isPuan) {
            suffix = 'TL Puan';
        }

        const newEarning = `${campaign.max_discount} ${suffix}`;

        fixes.push({
            id: campaign.id,
            title: campaign.title,
            description: campaign.description || '',
            category: 'FIXED_AMOUNT_MISMATCH',
            current: {
                earning: campaign.earning,
                max_discount: campaign.max_discount
            },
            updates: {
                earning: newEarning
            },
            reason: `AI "işlem başı kazanç" ile "toplam kazanç" karıştırdı. Earning toplam kazanç olmalı: ${campaign.max_discount} ${suffix}`
        });
    }

    // Category 2a: Taksit campaigns
    for (const campaign of campaigns.filter(c => TAKSIT_IDS.includes(c.id))) {
        fixes.push({
            id: campaign.id,
            title: campaign.title,
            description: campaign.description || '',
            category: 'TAKSIT_KAMPANYASI',
            current: {
                earning: campaign.earning,
                discount: campaign.discount,
                max_discount: campaign.max_discount
            },
            updates: {
                earning: '3 Taksit',
                discount: '3 Taksit',
                max_discount: null
            },
            reason: 'Taksit kampanyası. earning ve discount "3 Taksit" olmalı, max_discount kaldırılmalı.'
        });
    }

    // Category 2b: Başvuru campaigns
    for (const campaign of campaigns.filter(c => BASVURU_IDS.includes(c.id))) {
        fixes.push({
            id: campaign.id,
            title: campaign.title,
            description: campaign.description || '',
            category: 'BASVURU_KAMPANYASI',
            current: {
                earning: campaign.earning,
                min_spend: campaign.min_spend,
                max_discount: campaign.max_discount
            },
            updates: {
                min_spend: null
            },
            reason: 'Başvuru kampanyası. min_spend gereksiz, kaldırılmalı.'
        });
    }

    // Print detailed report
    printDetailedReport(fixes);

    if (dryRun) {
        console.log('\n🔒 DRY RUN MODE - No changes made to database.');
        console.log('   Run with --execute flag to apply fixes.\n');
        return;
    }

    // Execute fixes
    await applyFixes(fixes);
}

function printDetailedReport(fixes: Fix[]) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 DETAYLI DÜZELTME RAPORU');
    console.log('═══════════════════════════════════════════════════════════\n');

    const byCategory = fixes.reduce((acc, fix) => {
        if (!acc[fix.category]) acc[fix.category] = [];
        acc[fix.category].push(fix);
        return acc;
    }, {} as Record<string, Fix[]>);

    for (const [category, categoryFixes] of Object.entries(byCategory)) {
        console.log(`\n${'━'.repeat(60)}`);
        console.log(`🔴 ${category} (${categoryFixes.length} kampanya)`);
        console.log('━'.repeat(60));

        categoryFixes.forEach((fix, idx) => {
            console.log(`\n${idx + 1}. ID ${fix.id}: ${fix.title}`);
            console.log(`\n   📝 Açıklama:`);
            console.log(`   ${fix.description.substring(0, 200)}${fix.description.length > 200 ? '...' : ''}`);

            console.log(`\n   📊 Mevcut Değerler:`);
            Object.entries(fix.current).forEach(([key, value]) => {
                console.log(`      ${key}: ${JSON.stringify(value)}`);
            });

            console.log(`\n   ✅ Yeni Değerler:`);
            Object.entries(fix.updates).forEach(([key, value]) => {
                console.log(`      ${key}: ${JSON.stringify(value)}`);
            });

            console.log(`\n   💡 Sebep: ${fix.reason}`);
        });
    }

    console.log(`\n\n${'═'.repeat(60)}`);
    console.log(`📋 TOPLAM: ${fixes.length} kampanya düzeltilecek`);
    console.log('═'.repeat(60));
}

async function applyFixes(fixes: Fix[]) {
    console.log('\n💾 Applying fixes to database...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const fix of fixes) {
        const { error } = await supabase
            .from('campaigns')
            .update(fix.updates)
            .eq('id', fix.id);

        if (error) {
            console.error(`❌ Error fixing ID ${fix.id}:`, error.message);
            errorCount++;
        } else {
            console.log(`✅ Fixed ID ${fix.id}: ${fix.title.substring(0, 50)}...`);
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

generateFixReport(dryRun)
    .then(() => {
        console.log('✨ Script finished.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });
