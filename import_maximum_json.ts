
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateSectorSlug } from './src/utils/slugify';
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

        // Participation steps mapping
        const participationText = item.participation_method;

        // Conditions mapping
        const conditionsText = Array.isArray(item.conditions) ? item.conditions.join('\n') : item.conditions;

        const campaignData = {
            bank: bankName,
            card_name: cardName,
            title: item.title,
            description: item.description,
            image: item.image,
            url: item.url,
            reference_url: item.url,
            category: item.category,
            sector_slug: sectorSlug,
            valid_until: item.valid_until,
            // valid_from: item.valid_from, // Optional, schema might not expect checks
            min_spend: item.min_spend || 0,
            max_discount: item.max_discount || 0,
            discount: item.discount,
            earning: item.earning,
            conditions: conditionsText,
            participation_method: participationText,
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
