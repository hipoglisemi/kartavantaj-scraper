
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { parseWithGemini } from './src/services/geminiParser';
import { lookupIDs } from './src/utils/idMapper';
import { assignBadge } from './src/services/badgeAssigner';
import { markGenericBrand } from './src/utils/genericDetector';
import { validateAIParsing } from './src/services/aiValidator';
import { generateSectorSlug } from './src/utils/slugify';
import { syncEarningAndDiscount } from './src/utils/dataFixer';
import { validateAndFixEarningType } from './src/utils/earningValidator';
import { detectAndFormatTieredCampaign } from './src/utils/tieredCampaignDetector';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const RAW_FILE_PATH = './vakifbank_kampanyalar_raw.json';
const BANK_NAME = 'Vakıfbank';
const CARD_NAME = 'Vakıfbank World'; // Vakıfbank also uses World system, but has 'Vakıfbank Worldcard'

async function importCampaigns() {
    console.log(`\n💳 ${BANK_NAME} Import (PC JSON)...`);

    if (!fs.existsSync(RAW_FILE_PATH)) {
        console.error(`❌ Dosya bulunamadı: ${RAW_FILE_PATH}`);
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(RAW_FILE_PATH, 'utf-8'));
    console.log(`\n📋 ${rawData.length} kampanya yüklendi\n`);

    // Fetch Master Data once
    // ... logic handled inside geminiParser ideally, but we need IDs.
    // We will use lookupIds which caches master data.

    let successCount = 0;
    let errorCount = 0;

    for (const [index, item] of rawData.entries()) {
        const title = item.title;
        console.log(`   [${index + 1}/${rawData.length}] ${title.substring(0, 50)}...`);

        try {
            // 1. AI Parsing (Hybrid: Flash + Thinking + Python)
            const parsedData = await parseWithGemini(
                `${item.title}\n${item.detail_html}`,
                item.url,
                BANK_NAME,
                CARD_NAME,
                { category: item.category } // If available
            );

            if (!parsedData) {
                throw new Error('AI returned no data');
            }

            // 1.5. Post-processing validation chain
            const originalText = `${item.title}\n${item.detail_html}`;

            // First: Detect tiered campaigns (this might update earning format)
            let validatedData = detectAndFormatTieredCampaign(parsedData, originalText);

            // Second: Fix earning type errors (Puan vs İndirim)
            validatedData = validateAndFixEarningType(validatedData, originalText);

            // 2. ID Mapping
            const { bank_id, card_id, sector_id } = await lookupIDs(
                validatedData.bank || BANK_NAME,
                validatedData.card || CARD_NAME,
                undefined,
                validatedData.sector_slug
            );

            // 3. Badge & Generic Status
            const badges = assignBadge({
                title: validatedData.title,
                earning: validatedData.earning
            });

            // 4. Construct DB Object
            const campaignData: any = {
                bank_id,
                card_id,
                sector_id,
                bank: validatedData.bank || BANK_NAME,
                card_name: CARD_NAME,
                title: validatedData.title,
                description: validatedData.description,
                reference_url: item.url,
                url: item.url,
                image: item.image,

                valid_from: validatedData.valid_from,
                valid_until: validatedData.valid_until,

                category: validatedData.category || 'Diğer',
                sector_slug: validatedData.sector_slug,

                min_spend: validatedData.min_spend || 0,
                earning: validatedData.earning,
                max_discount: validatedData.max_discount || 0,
                discount_rate: validatedData.discount_rate,
                max_installments: validatedData.max_installments,

                badge_text: badges.text,
                badge_color: badges.color,

                conditions: validatedData.conditions,
                participation_method: validatedData.participation_method,

                eligible_customers: validatedData.eligible_customers,
                brand: validatedData.brand,
                is_active: true,
                slug: validatedData.slug
            };

            // STRICT ASSIGNMENT (following Axess pattern)
            campaignData.card_name = CARD_NAME;
            campaignData.bank = BANK_NAME;
            campaignData.url = item.url;
            campaignData.reference_url = item.url;
            campaignData.image = item.image;
            campaignData.category = validatedData.category || 'Diğer';
            campaignData.sector_slug = generateSectorSlug(campaignData.category);
            syncEarningAndDiscount(campaignData);
            campaignData.is_active = true;

            // Apply generic check (modifies brand if generic)
            markGenericBrand(campaignData);

            // 5. Upsert
            const { error } = await supabase
                .from('campaigns')
                .upsert(campaignData, { onConflict: 'reference_url' });

            if (error) {
                console.error(`      ❌ DB Error: ${error.message}`);
                errorCount++;
            } else {
                console.log(`      ✅ Kaydedildi: ${validatedData.title}`);
                successCount++;
            }

        } catch (error) {
            console.error(`      ❌ Parse Error: ${error}`);
            errorCount++;
        }
    }

    console.log(`\n✅ Tamamlandı!`);
    console.log(`   Başarılı: ${successCount}`);
    console.log(`   Hatalı: ${errorCount}`);
}

importCampaigns();
