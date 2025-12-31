
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateSectorSlug } from './src/utils/slugify';
import { parseWithGemini } from './src/services/geminiParser';
import { normalizeBankName, normalizeCardName } from './src/utils/bankMapper';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function importMaximumJson() {
    const jsonPath = path.join(process.cwd(), 'maximum_kampanyalar_hibrit.json');

    if (!fs.existsSync(jsonPath)) {
        console.error('❌ JSON file not found:', jsonPath);
        return;
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const campaigns = JSON.parse(rawData);

    console.log(`🚀 Importing ${campaigns.length} campaigns from JSON to Supabase...`);

    const bankName = await normalizeBankName('İş Bankası');

    for (const item of campaigns) {
        // Basic normalization
        // card_name logic: Use Python's 'eligible_customers' array to pick the best one, or default to 'Maximum'
        let cardName = 'Maximum';
        if (item.eligible_customers && item.eligible_customers.length > 0) {
            // Prefer 'Maximum Kart' or take the first one
            if (item.eligible_customers.includes('Maximum Kart')) cardName = 'Maximum';
            else cardName = item.eligible_customers[0];
        }
        cardName = await normalizeCardName(bankName, cardName);

        const sectorSlug = generateSectorSlug(item.category || 'Diğer');

        // Conditions mapping
        const conditions = Array.isArray(item.conditions) ? item.conditions : (item.conditions ? [item.conditions] : []);
        const participation = Array.isArray(item.participation_method) ? item.participation_method : (item.participation_method ? [item.participation_method] : []);

        // Create text context for AI
        const combinedText = `
            ${item.title}
            ${item.description}
            ${conditions.join('\n')}
            ${participation.join('\n')}
        `;

        // 🔥 AI Enrichment (Gemini)
        let aiData = {};
        try {
            console.log(`   🧠 AI Analiz ediliyor: ${item.title.substring(0, 30)}...`);
            // Pass hardcoded 'İş Bankası' and current partial cardName
            aiData = await parseWithGemini(combinedText, item.url, bankName, cardName);
        } catch (err) {
            console.error(`   ⚠️ AI Parse Error (${item.title}):`, err.message);
        }

        // Merge Logic: Python V8 (High Trust for Math) > AI (High Trust for Text/Class)
        // We override sector, brand, description with AI data if available

        const campaignData = {
            bank: bankName,
            card_name: cardName, // Keep Python's card logic as it's specific
            title: item.title, // Keep original title (usually accurate from Python)
            description: aiData.description || item.description, // AI description is usually more marketing-friendly
            image: item.image,
            url: item.url,
            reference_url: item.url,
            category: aiData.category || item.category, // AI category is much better mapped to Master Sectors
            sector_slug: aiData.sector_slug || sectorSlug,
            brand: aiData.brand, // AI extracts brands much better
            valid_until: item.valid_until, // Trust Python regex for dates
            // valid_from: item.valid_from, 
            min_spend: item.min_spend || aiData.min_spend || 0, // Fallback to AI if Python missed it
            max_discount: item.max_discount || aiData.max_discount || 0,
            discount: item.discount || aiData.discount,
            earning: item.earning || aiData.earning, // Fallback to AI
            conditions: conditions,
            participation_method: participation,
            is_active: true,
            created_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('campaigns')
            .upsert(campaignData, { onConflict: 'reference_url' });

        if (error) {
            console.error(`   ❌ Error saving ${item.title}:`, error.message);
        } else {
            console.log(`   ✅ Saved: ${item.title}`);
        }
    }

    console.log('\n✅ Import completed!');
}

if (require.main === module) {
    importMaximumJson();
}
