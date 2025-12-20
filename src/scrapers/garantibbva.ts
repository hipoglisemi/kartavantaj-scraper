
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../services/geminiParser';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BASE_URL = 'https://www.bonus.com.tr';
const CAMPAIGNS_URL = 'https://www.bonus.com.tr/kampanyalar';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runGarantiScraper() {
    console.log('🚀 Starting Garanti BBVA (Bonus) Scraper...');
    const isAIEnabled = process.argv.includes('--ai');

    try {
        // 1. Fetch Campaign List
        console.log(`   📄 Fetching campaign list from ${CAMPAIGNS_URL}...`);
        const response = await axios.get(CAMPAIGNS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        const campaignLinks: string[] = [];

        $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('/kampanyalar/') && href.split('/').length > 2) {
                // Filter out irrelevant links
                if (!['sektor', 'kategori', 'marka', '#', 'javascript'].some(x => href.includes(x))) {
                    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                    if (!campaignLinks.includes(fullUrl)) {
                        campaignLinks.push(fullUrl);
                    }
                }
            }
        });

        console.log(`   🎉 Found ${campaignLinks.length} campaigns. Processing details...`);

        // 2. Process Details
        for (const fullUrl of campaignLinks) {
            console.log(`\n   🔍 Processing: ${fullUrl}`);

            try {
                const detailResponse = await axios.get(fullUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    timeout: 20000
                });

                const html = detailResponse.data;
                const $detail = cheerio.load(html);

                // Extract basic info for fallback
                const title = $detail('.campaign-detail-title h1').text().trim() || 'Başlıksız Kampanya';
                let imageUrl = $detail('.campaign-detail__image img').attr('src');

                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = `${BASE_URL}${imageUrl}`;
                }

                // AI Parsing
                let campaignData;
                if (isAIEnabled) {
                    campaignData = await parseWithGemini(html, fullUrl);
                } else {
                    campaignData = {
                        title: title,
                        description: title,
                        card_name: 'Bonus',
                        reference_url: fullUrl,
                        image_url: imageUrl || '',
                        is_active: true
                    };
                }

                if (campaignData) {
                    // Force fields
                    campaignData.card_name = 'Bonus'; // Default to Bonus, specific cards handled by AI if needed or generic override
                    campaignData.reference_url = fullUrl;
                    if (!campaignData.image_url && imageUrl) {
                        campaignData.image_url = imageUrl;
                    }
                    campaignData.is_active = true;
                    // Garanti campaigns often mention specific cards like "Money Bonus", "Flexi" etc. 
                    // The AI parser is instructed to pick this up in 'eligible_customers'.
                    // For the main 'card_name' column, strictly 'Bonus' is good for grouping, 
                    // or we could map valid cards. For now, sticking to 'Bonus' as the primary brand.

                    // Upsert
                    const { error } = await supabase
                        .from('campaigns')
                        .upsert(campaignData, { onConflict: 'reference_url' });

                    if (error) {
                        console.error(`      ❌ Supabase Error: ${error.message}`);
                    } else {
                        console.log(`      ✅ Saved to DB: ${title}`);
                    }
                }

            } catch (err: any) {
                console.error(`      ❌ Error processing detail ${fullUrl}: ${err.message}`);
            }

            await sleep(1500); // Polite delay
        }

    } catch (error: any) {
        console.error(`❌ Global Error: ${error.message}`);
    }
}

runGarantiScraper();
