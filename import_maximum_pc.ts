import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { parseWithGemini } from './src/services/geminiParser';
import { generateSectorSlug } from './src/utils/slugify';
import { normalizeBankName, normalizeCardName } from './src/utils/bankMapper';
import { lookupIDs } from './src/utils/idMapper';
import { assignBadge } from './src/services/badgeAssigner';
import { markGenericBrand } from './src/utils/genericDetector';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function importMaximumFromPC() {
    console.log(`\n💳 Maximum Import (PC JSON)...\n`);

    // Read PC JSON
    const jsonPath = process.argv[2] || '/Users/hipoglisemi/Desktop/final/İŞ BANKASI/maximum_kampanyalar_hibrit.json';

    if (!fs.existsSync(jsonPath)) {
        console.error(`❌ Dosya bulunamadı: ${jsonPath}`);
        return;
    }

    const campaigns: any[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📋 ${campaigns.length} kampanya yüklendi\n`);

    const normalizedBank = await normalizeBankName('İş Bankası');
    const normalizedCard = await normalizeCardName(normalizedBank, 'Maximum');

    let processed = 0;
    let errors = 0;

    for (const pythonData of campaigns) {
        console.log(`   [${processed + 1}/${campaigns.length}] ${pythonData.title.substring(0, 40)}...`);

        try {
            // Check if already exists
            const { data: existing } = await supabase
                .from('campaigns')
                .select('id')
                .eq('reference_url', pythonData.url)
                .single();

            if (existing) {
                console.log(`      ⏭️  Zaten var, atlandı`);
                continue;
            }

            // AI Processing
            let aiData: any = {};
            try {
                console.log(`      🧠 AI işleniyor...`);
                const fullText = pythonData.conditions?.join(' ') || pythonData.description || '';
                aiData = await parseWithGemini(fullText, pythonData.url, normalizedBank, normalizedCard);
            } catch (err: any) {
                console.error(`      ⚠️  AI Hatası: ${err.message}`);
            }

            // Merge Python + AI data
            const campaignData: any = {
                title: pythonData.title,
                image: pythonData.image,
                card_name: normalizedCard,
                bank: normalizedBank,
                url: pythonData.url,
                reference_url: pythonData.url,

                // From Python (priority)
                min_spend: pythonData.min_spend || 0,
                max_discount: pythonData.max_discount || 0,
                discount: pythonData.discount || aiData.discount,
                earning: pythonData.earning || aiData.earning,
                valid_from: pythonData.valid_from || aiData.valid_from,
                valid_until: pythonData.valid_until || aiData.valid_until,

                // From AI (priority)
                description: aiData.description || pythonData.description || pythonData.title,
                category: aiData.category || pythonData.category || 'Diğer',
                brand: aiData.brand || pythonData.merchant,
                conditions: aiData.conditions || pythonData.conditions || [],
                participation_method: aiData.participation_method || pythonData.participation_method,
                eligible_customers: aiData.eligible_customers || pythonData.eligible_customers || ['Maximum'],

                sector_slug: generateSectorSlug(aiData.category || pythonData.category || 'Diğer'),
                is_active: true
            };

            // Lookup IDs
            const ids = await lookupIDs(
                campaignData.bank,
                campaignData.card_name,
                campaignData.brand,
                campaignData.sector_slug
            );
            Object.assign(campaignData, ids);

            // Assign badge
            const badge = assignBadge(campaignData);
            campaignData.badge_text = badge.text;
            campaignData.badge_color = badge.color;
            markGenericBrand(campaignData);

            // Save
            const { error } = await supabase
                .from('campaigns')
                .upsert(campaignData, { onConflict: 'reference_url' });

            if (error) {
                console.error(`      ❌ DB Hatası: ${error.message}`);
                errors++;
            } else {
                console.log(`      ✅ Kaydedildi`);
                processed++;
            }

        } catch (error: any) {
            console.error(`      ❌ Hata: ${error.message}`);
            errors++;
        }

        await sleep(1500);
    }

    console.log(`\n✅ Tamamlandı!`);
    console.log(`   Başarılı: ${processed}`);
    console.log(`   Hatalı: ${errors}`);
}

importMaximumFromPC();
