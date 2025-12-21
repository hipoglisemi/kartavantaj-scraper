
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const CARD_CONFIG = {
    name: 'World',
    cardName: 'World',
    bank: 'Yapı Kredi',
    baseUrl: 'https://www.worldcard.com.tr',
    listApiUrl: 'https://www.worldcard.com.tr/api/campaigns?campaignSectorId=6d897e71-1849-43a3-a64f-62840e8c0442&campaignSectorKey=tum-kampanyalar'
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runWorldScraper() {
    console.log(`\n💳 Starting ${CARD_CONFIG.name} Card Scraper...`);
    console.log(`   Bank: ${CARD_CONFIG.bank}`);
    console.log(`   Source: ${CARD_CONFIG.baseUrl}\n`);

    const isAIEnabled = process.argv.includes('--ai');
    let page = 1;
    let allCampaigns = [];

    // 1. Fetch List from API
    while (true) {
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries) {
            try {
                console.log(`   📄 Fetching page ${page}${retries > 0 ? ` (retry ${retries})` : ''}...`);
                const response = await axios.get(CARD_CONFIG.listApiUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': `${CARD_CONFIG.baseUrl}/kampanyalar`,
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
                    },
                    params: {
                        page: page.toString()
                    },
                    timeout: 30000 // 30 second timeout
                });

                const items = response.data.Items;
                if (!items || items.length === 0) {
                    console.log(`   ✅ Page ${page} is empty. Finished fetching list.`);
                    return; // Exit the function completely
                }

                allCampaigns.push(...items);
                console.log(`   ✅ Found ${items.length} campaigns on page ${page}.`);
                page++;
                await sleep(1000);
                break; // Success, exit retry loop
            } catch (error: any) {
                retries++;
                console.error(`   ⚠️  Error fetching page ${page} (attempt ${retries}/${maxRetries}): ${error.message}`);

                if (retries >= maxRetries) {
                    console.error(`   ❌ Failed after ${maxRetries} attempts. Moving to next step.`);
                    return; // Exit function if all retries failed
                }

                // Exponential backoff: 2s, 4s, 8s
                const backoffTime = Math.pow(2, retries) * 1000;
                console.log(`   ⏳ Waiting ${backoffTime / 1000}s before retry...`);
                await sleep(backoffTime);
            }
        }
    }

    console.log(`\n🎉 Total ${allCampaigns.length} campaigns found. Filtering active ones...\n`);

    // Filter only active campaigns (EndDate >= today)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const activeCampaigns = allCampaigns.filter(item => {
        if (!item.EndDate) return true; // Include if no end date
        const endDate = new Date(item.EndDate);
        return endDate >= today;
    });

    console.log(`✅ ${activeCampaigns.length} active campaigns (${allCampaigns.length - activeCampaigns.length} expired filtered out)\n`);

    // 2. Process Details
    for (const item of allCampaigns) {
        const urlPart = item.Url;
        if (!urlPart) continue;

        const fullUrl = new URL(urlPart, CARD_CONFIG.baseUrl).toString();
        let imageUrl = item.ImageUrl ? new URL(item.ImageUrl.split('?')[0], CARD_CONFIG.baseUrl).toString() : '';
        const title = item.SpotTitle || item.PageTitle || item.Title || 'Başlıksız Kampanya';

        console.log(`   🔍 Fetching: ${title.substring(0, 50)}...`);

        try {
            const detailResponse = await axios.get(fullUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            const html = detailResponse.data;

            // AI Parsing
            let campaignData;
            if (isAIEnabled) {
                campaignData = await parseWithGemini(html, fullUrl);
            } else {
                campaignData = {
                    title: title,
                    description: title,
                    card_name: CARD_CONFIG.cardName,
                    bank: CARD_CONFIG.bank,
                    url: fullUrl,
                    reference_url: fullUrl,
                    image: imageUrl,
                    is_active: true
                };
            }

            if (campaignData) {
                // STRICT ASSIGNMENT - Prevent AI misclassification
                campaignData.title = title;
                campaignData.card_name = CARD_CONFIG.cardName;
                campaignData.bank = CARD_CONFIG.bank;
                campaignData.url = fullUrl;
                campaignData.reference_url = fullUrl;
                campaignData.image = imageUrl;
                campaignData.category = campaignData.category || 'Diğer';
                campaignData.is_active = true;

                // Upsert to Supabase
                const { error } = await supabase
                    .from('campaigns')
                    .upsert(campaignData, { onConflict: 'reference_url' });

                if (error) {
                    console.error(`      ❌ Supabase Error: ${error?.message || 'Unknown error'}`);
                } else {
                    console.log(`      ✅ Saved: ${campaignData.title}`);
                }
            }

        } catch (error: any) {
            console.error(`      ❌ Error: ${error.message}`);
        }

        await sleep(1500);
    }

    console.log(`\n✅ ${CARD_CONFIG.name} scraper completed!`);
}

runWorldScraper();
