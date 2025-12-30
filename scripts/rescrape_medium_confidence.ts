// Rescrape 26 medium-confidence campaigns with Smart Hybrid AI
import { supabase } from '../src/utils/supabase';
import { parseWithGemini } from '../src/services/geminiParser';
import * as dotenv from 'dotenv';

dotenv.config();

// Medium-confidence campaign IDs from validation
const DEFAULT_IDS = [
    15060, 15059, 15055, 15036, 15035, 15034, 15031, 14984, 14977, 14976,
    14966, 14965, 14964, 14963, 14961, 14952, 14940, 14938, 14937, 14931,
    14915, 14755, 14747, 14746, 14745, 14713
];

// Support passing specific ID via --id argument
const args = process.argv.slice(2);
const idArg = args.indexOf('--id');
const CAMPAIGN_IDS = idArg !== -1 && args[idArg + 1]
    ? [parseInt(args[idArg + 1])]
    : DEFAULT_IDS;

interface RescrapeResult {
    id: number;
    title: string;
    before_min_spend: number;
    after_min_spend: number;
    changed: boolean;
    success: boolean;
    error?: string;
}

async function main() {
    console.log('🔄 Medium-Confidence Kampanyalar Yeniden Scrape Ediliyor...\n');
    console.log(`📋 Toplam: ${CAMPAIGN_IDS.length} kampanya\n`);

    const results: RescrapeResult[] = [];
    let successCount = 0;
    let failCount = 0;
    let changedCount = 0;

    for (const id of CAMPAIGN_IDS) {
        try {
            // 1. Fetch campaign
            const { data: campaign, error: fetchError } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            console.log(`\n📝 [${CAMPAIGN_IDS.indexOf(id) + 1}/${CAMPAIGN_IDS.length}] ${campaign.title.substring(0, 50)}...`);
            console.log(`   Mevcut min_spend: ${campaign.min_spend}`);

            // 2. Re-parse with Smart Hybrid
            const rawContent = campaign.raw_content || campaign.title + ' ' + campaign.description;
            const parsed = await parseWithGemini(rawContent, campaign.url, campaign.bank, campaign.card_name);

            console.log(`   Yeni min_spend: ${parsed.min_spend}`);

            const changed = campaign.min_spend !== parsed.min_spend;

            if (changed) {
                // 3. Update if changed
                const { error: updateError } = await supabase
                    .from('campaigns')
                    .update({ min_spend: parsed.min_spend })
                    .eq('id', id);

                if (updateError) throw updateError;

                console.log(`   ✅ Güncellendi (${campaign.min_spend} → ${parsed.min_spend})`);
                changedCount++;
            } else {
                console.log(`   ✓ Değişiklik yok`);
            }

            results.push({
                id,
                title: campaign.title,
                before_min_spend: campaign.min_spend,
                after_min_spend: parsed.min_spend,
                changed,
                success: true
            });

            successCount++;

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error: any) {
            console.error(`   ❌ Hata: ${error.message}`);

            results.push({
                id,
                title: 'Error',
                before_min_spend: 0,
                after_min_spend: 0,
                changed: false,
                success: false,
                error: error.message
            });

            failCount++;
        }
    }

    // Generate report
    console.log('\n\n📊 ===== RESCRAPE RAPORU =====\n');

    console.log(`✅ Başarılı: ${successCount}`);
    console.log(`❌ Başarısız: ${failCount}`);
    console.log(`🔄 Değişen: ${changedCount}`);
    console.log(`✓ Değişmeyen: ${successCount - changedCount}`);
    console.log(`📈 Başarı Oranı: ${((successCount / CAMPAIGN_IDS.length) * 100).toFixed(1)}%\n`);

    // Detailed table
    console.log('📋 Detaylı Sonuçlar:\n');
    console.table(results.map(r => ({
        ID: r.id,
        'Önce': r.before_min_spend,
        'Sonra': r.after_min_spend,
        'Değişti': r.changed ? '✅' : '-',
        'Durum': r.success ? '✅' : '❌'
    })));

    // Save results
    const fs = require('fs');
    fs.writeFileSync(
        'rescrape_medium_confidence_results.json',
        JSON.stringify(results, null, 2)
    );
    console.log('\n💾 Detaylı sonuçlar: rescrape_medium_confidence_results.json\n');
}

main().catch(console.error);
