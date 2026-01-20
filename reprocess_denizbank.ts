import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseWithGemini } from './src/services/geminiParser';
import { generateCampaignSlug } from './src/utils/slugify';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const campaigns = [
    'https://www.denizbonus.com/kampanyalar/google-play-harcamalariniza-yuzde50-indirim',
    'https://www.denizbonus.com/kampanyalar/pegasus-ucak-biletinize-500tl-bonus',
    'https://www.denizbonus.com/kampanyalar/prontotour-da-2000-tlye-varan-bonus',
    'https://www.denizbonus.com/kampanyalar/denizbank-kredi-kartinizla-secili-egitim-kurumlarinda-arti5-taksit-firsati',
    'https://www.denizbonus.com/kampanyalar/denizbank-kredi-kartinizla-sigorta-bes-odemelerinize-3taksit'
];

async function reprocessCampaigns() {
    for (const url of campaigns) {
        console.log(`\n\n🔄 Re-processing: ${url}`);

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });

            const html = response.data;
            const $ = cheerio.load(html);
            const title = $('h1').first().text().trim();

            console.log(`   Title: ${title}`);
            console.log(`   🤖 Parsing with Gemini AI...`);

            const campaignData = await parseWithGemini(html, url, 'Denizbank', 'DenizBonus');

            if (campaignData) {
                console.log(`\n   ✅ AI Parsed Data:`);
                console.log(`      earning: ${campaignData.earning || 'EMPTY'}`);
                console.log(`      min_spend: ${campaignData.min_spend}`);
                console.log(`      max_discount: ${campaignData.max_discount}`);
                console.log(`      discount: ${campaignData.discount || 'EMPTY'}`);
                console.log(`      discount_percentage: ${campaignData.discount_percentage}`);
                console.log(`      description: ${campaignData.description?.substring(0, 80)}...`);

                // Update in database
                const { data: existing } = await supabase
                    .from('campaigns')
                    .select('id')
                    .eq('reference_url', url)
                    .single();

                if (existing) {
                    const finalSlug = generateCampaignSlug(campaignData.title || title, existing.id);
                    const { error } = await supabase
                        .from('campaigns')
                        .update({
                            ...campaignData,
                            slug: finalSlug,
                            title: title
                        })
                        .eq('id', existing.id);

                    if (error) {
                        console.error(`      ❌ Update Error: ${error.message}`);
                    } else {
                        console.log(`      💾 Updated in database (slug: ${finalSlug})`);
                    }
                }
            } else {
                console.error(`      ❌ AI parsing failed`);
            }

            await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (error: any) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }

    console.log('\n\n✅ Re-processing complete!');
}

reprocessCampaigns();
