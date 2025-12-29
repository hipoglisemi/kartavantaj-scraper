import { supabase } from '../src/utils/supabase';

/**
 * Check all campaigns for min-max range issues
 * Pattern: "X TL - Y TL arası" should use X (min) for min_spend, not Y (max)
 */

interface Campaign {
    id: number;
    title: string;
    min_spend: number | null;
    description: string | null;
    conditions: string[] | null;
}

interface Issue {
    id: number;
    title: string;
    current_min_spend: number;
    detected_min: number;
    detected_max: number;
    source_text: string;
}

async function checkAllCampaignsForRanges() {
    console.log('🔍 Tüm kampanyalarda aralık (min-max) kontrolü yapılıyor...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, min_spend, description, conditions')
        .not('min_spend', 'is', null)
        .order('id', { ascending: false });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`📊 Toplam ${campaigns.length} kampanya kontrol ediliyor...\n`);

    const issues: Issue[] = [];

    const patterns = [
        { name: 'Tire (-)', regex: /(\d+(?:\.\d+)?)\s*(?:tl)?\s*-\s*(\d+(?:\.\d+)?)\s*tl/gi },
        { name: 'Ve/İle', regex: /(\d+(?:\.\d+)?)\s*tl\s*(?:ve|ile)\s*(\d+(?:\.\d+)?)\s*tl/gi },
        { name: 'Arası', regex: /(\d+(?:\.\d+)?)\s*tl\s*(?:ve|ile)?\s*(\d+(?:\.\d+)?)\s*tl\s*aras/gi },
    ];

    for (const campaign of campaigns as Campaign[]) {
        const fullText = [campaign.title, campaign.description || '', ...(campaign.conditions || [])].join(' ');

        for (const pattern of patterns) {
            const matches = [...fullText.matchAll(pattern.regex)];

            for (const match of matches) {
                const minStr = match[1].replace(/\./g, '');
                const maxStr = match[2].replace(/\./g, '');
                const minAmount = parseFloat(minStr);
                const maxAmount = parseFloat(maxStr);

                // Skip if not a valid range
                if (minAmount >= maxAmount) continue;

                // Check if min_spend is using MAX instead of MIN
                if (campaign.min_spend === maxAmount) {
                    issues.push({
                        id: campaign.id,
                        title: campaign.title,
                        current_min_spend: campaign.min_spend,
                        detected_min: minAmount,
                        detected_max: maxAmount,
                        source_text: match[0]
                    });
                }
            }
        }
    }

    // Print results
    if (issues.length === 0) {
        console.log('✅ Tüm kampanyalar doğru! Hiçbir aralık hatası bulunamadı.\n');
        return;
    }

    console.log('═'.repeat(60));
    console.log(`❌ ${issues.length} KAMPANYADA ARALIK HATASI TESPİT EDİLDİ`);
    console.log('═'.repeat(60));

    issues.forEach((issue, idx) => {
        console.log(`\n${idx + 1}. ID ${issue.id}: ${issue.title.substring(0, 60)}`);
        console.log(`   Metin: "${issue.source_text}"`);
        console.log(`   Tespit: ${issue.detected_min} TL - ${issue.detected_max} TL`);
        console.log(`   ❌ Mevcut min_spend: ${issue.current_min_spend} (MAX değer kullanılmış!)`);
        console.log(`   ✅ Olması gereken: ${issue.detected_min} (MIN değer)`);
    });

    console.log(`\n\n═'.repeat(60)`);
    console.log(`📋 ÖZET: ${issues.length} kampanya düzeltilmeli`);
    console.log('═'.repeat(60));

    return issues;
}

async function fixRangeIssues(dryRun: boolean = true) {
    const issues = await checkAllCampaignsForRanges();

    if (!issues || issues.length === 0) {
        return;
    }

    if (dryRun) {
        console.log('\n🔒 DRY RUN MODE - No changes made to database.');
        console.log('   Run with --execute flag to apply fixes.\n');
        return;
    }

    console.log('\n💾 Applying fixes...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const issue of issues) {
        const { error } = await supabase
            .from('campaigns')
            .update({ min_spend: issue.detected_min })
            .eq('id', issue.id);

        if (error) {
            console.error(`❌ Error fixing ID ${issue.id}:`, error.message);
            errorCount++;
        } else {
            console.log(`✅ Fixed ID ${issue.id}: ${issue.current_min_spend} → ${issue.detected_min} TL`);
            successCount++;
        }
    }

    console.log(`\n═'.repeat(60)`);
    console.log(`✅ Fix complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('═'.repeat(60));
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (dryRun) {
    console.log('🔍 Running in DRY RUN mode...\n');
} else {
    console.log('⚡ Running in EXECUTE mode...\n');
}

fixRangeIssues(dryRun)
    .then(() => {
        console.log('\n✨ Script finished.');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });
