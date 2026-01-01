
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

async function importParafFromPC() {
    console.log(`\n💳 Paraf Import (PC JSON)...\n`);

    // Read PC JSON
    const jsonPath = process.argv[2] || 'paraf_kampanyalar_raw.json';

    if (!fs.existsSync(jsonPath)) {
        console.error(`❌ Dosya bulunamadı: ${jsonPath}`);
        return;
    }

    const campaigns: any[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📋 ${campaigns.length} kampanya yüklendi\n`);

    const normalizedBank = await normalizeBankName('Halkbank');
    const normalizedCard = await normalizeCardName(normalizedBank, 'Paraf');

    let processed = 0;
    let errors = 0;

    for (const pythonData of campaigns) {
        console.log(`   [${processed + 1}/${campaigns.length}] ${pythonData.title.substring(0, 40)}...`);

        try {
            // Check if already exists (Optional: can be disabled to force update)
            /*
            const { data: existing } = await supabase
                .from('campaigns')
                .select('id')
                .eq('reference_url', pythonData.url)
                .single();

            if (existing) {
                console.log(`      ⏭️  Zaten var, atlandı`);
                continue;
            }
            */

            // AI Processing
            let aiData: any = {};
            try {
                // Use detail_html for better parsing if available, otherwise description
                const contentToParse = pythonData.detail_html || pythonData.description || pythonData.title;

                // Remove script/style tags for cleaner input if it's HTML
                const cleanContent = contentToParse.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

                // console.log(`      🧠 AI işleniyor (${cleanContent.length} chars)...`);
                aiData = await parseWithGemini(cleanContent, pythonData.url, normalizedBank, normalizedCard);
            } catch (err: any) {
                console.error(`      ⚠️  AI Hatası: ${err.message}`);
                // Fallback to minimal data
                aiData = {
                    title: pythonData.title,
                    description: pythonData.description,
                    category: 'Diğer'
                };
            }

            // Merge Python + AI data
            let finalCards = aiData.eligible_customers;
            // If AI found generic "Paraf" or nothing, add defaults
            if (!finalCards || finalCards.length === 0) finalCards = [normalizedCard, 'Paraf Mobil'];

            const campaignData: any = {
                title: pythonData.title, // Python title is usually clean
                image: pythonData.image || aiData.image, // Prefer Python image
                card_name: normalizedCard,
                bank: normalizedBank,
                url: pythonData.url,
                reference_url: pythonData.url,

                // From AI (priority for logic)
                min_spend: aiData.min_spend || 0,
                max_discount: aiData.max_discount || 0,
                discount: aiData.discount,
                earning: aiData.earning,
                valid_from: aiData.valid_from,
                valid_until: aiData.valid_until,

                // Text fields
                description: aiData.description || pythonData.description,
                category: aiData.category || 'Diğer',
                brand: Array.isArray(aiData.brand) ? aiData.brand.join(', ') : (aiData.brand || ''),
                conditions: aiData.conditions || [],
                participation_method: aiData.participation_method,
                eligible_customers: finalCards,

                sector_slug: generateSectorSlug(aiData.category || 'Diğer'),
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

            // Generate marketing text if missing -> SKIPPING due to DB column missing
            // if (campaignData.description && (!campaignData.marketing_text)) {
            //      campaignData.marketing_text = campaignData.description;
            // }

            // Save
            const { error } = await supabase
                .from('campaigns')
                .upsert(campaignData, { onConflict: 'reference_url' });

            if (error) {
                console.error(`      ❌ DB Hatası: ${error.message}`);
                errors++;
            } else {
                console.log(`      ✅ Kaydedildi: ${campaignData.title}`);
                processed++;
            }

        } catch (error: any) {
            console.error(`      ❌ Hata: ${error.message}`);
            errors++;
        }

        await sleep(1000); // 1 sec delay between upserts
    }

    console.log(`\n✅ Tamamlandı!`);
    console.log(`   Başarılı: ${processed}`);
    console.log(`   Hatalı: ${errors}`);
}

importParafFromPC();
