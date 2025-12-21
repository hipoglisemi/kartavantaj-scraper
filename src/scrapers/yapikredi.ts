
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

const MAX_RETRIES = 3;

interface CardConfig {
    name: string;
    cardName: string;
    baseUrl: string;
    listApiUrl: string;
}

const CARDS: CardConfig[] = [
    {
        name: 'World',
        cardName: 'World',
        baseUrl: 'https://www.worldcard.com.tr',
        listApiUrl: 'https://www.worldcard.com.tr/api/campaigns?campaignSectorId=6d897e71-1849-43a3-a64f-62840e8c0442&campaignSectorKey=tum-kampanyalar'
    },
    {
        name: 'Adios',
        cardName: 'Adios',
        baseUrl: 'https://www.adioscard.com.tr',
        listApiUrl: 'https://www.adioscard.com.tr/api/campaigns?campaignSectorId=dfe87afe-9b57-4dfd-869b-c87dd00b85a1&campaignSectorKey=tum-kampanyalar'
    },
    {
        name: 'Play',
        cardName: 'Play',
        baseUrl: 'https://www.yapikrediplay.com.tr',
        listApiUrl: 'https://www.yapikrediplay.com.tr/api/campaigns?campaignSectorId=dfe87afe-9b57-4dfd-869b-c87dd00b85a1&campaignSectorKey=tum-kampanyalar'
    },
    {
        name: 'Crystal',
        cardName: 'Crystal',
        baseUrl: 'https://www.crystalcard.com.tr',
        listApiUrl: 'https://www.crystalcard.com.tr/api/campaigns?campaignSectorId=a5e7279b-0c32-4b5f-a8cd-97089a1092c2&campaignSectorKey=tum-kampanyalar'
    }
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchCampaignsForCard(card: CardConfig, isAIEnabled: boolean) {
    console.log(`\n💳 Starting scraper for: ${card.name} (${card.cardName})...`);
    console.log(`   Source: ${card.baseUrl}`);

    let page = 1;
    let allCampaigns = [];

    // 1. Fetch List from API
    while (true) {
        try {
            console.log(`   📄 Fetching page ${page}...`);
            const response = await axios.get(card.listApiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': `${card.baseUrl}/kampanyalar`,
                    'page': page.toString()
                }
            });

            const items = response.data.Items;
            if (!items || items.length === 0) {
                console.log(`   ✅ Page ${page} is empty. Finished fetching list.`);
                break;
            }

            allCampaigns.push(...items);
            console.log(`   ✅ Found ${items.length} campaigns on page ${page}.`);
            page++;
            await sleep(1000); // Polite delay
        } catch (error: any) {
            console.error(`   ❌ Error fetching page ${page}: ${error.message}`);
            break;
        }
    }

    console.log(`\n🎉 Total ${allCampaigns.length} campaigns found for ${card.name}. Processing details...`);

    // 2. Process Details
    for (const item of allCampaigns) {
        const urlPart = item.Url;
        if (!urlPart) continue;

        const fullUrl = new URL(urlPart, card.baseUrl).toString();
        // Skip duplicate check here, upsert will handle it, or check beforehand if optimization needed

        let imageUrl = item.ImageUrl ? new URL(item.ImageUrl.split('?')[0], card.baseUrl).toString() : '';
        const title = item.SpotTitle || item.PageTitle || item.Title || 'Başlıksız Kampanya';

        console.log(`\n   🔍 Fetching details: ${title.substring(0, 50)}...`);

        try {
            // Fetch Detail Page HTML
            const detailResponse = await axios.get(fullUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const html = detailResponse.data;
            const $ = cheerio.load(html);

            // Extract content for AI
            const contentSelector = card.name === 'Crystal' ? '.sub-content' : '.campaign-terms';
            let contentText = $(contentSelector).text().trim();

            // Fallback for content
            if (!contentText || contentText.length < 50) {
                contentText = $('body').text().trim().substring(0, 2000);
            }

            // AI Parsing
            let campaignData;
            if (isAIEnabled) {
                // Pass fullUrl as second argument instead of title/cardName
                campaignData = await parseWithGemini(html, fullUrl);
            } else {
                // Fallback basic data if AI is disabled (not recommended for this pipeline)
                campaignData = {
                    title: title,
                    description: title,
                    card_name: card.cardName,
                    url: fullUrl,           // Mapped
                    reference_url: fullUrl, // Mapped
                    image: imageUrl,        // Mapped
                    is_active: true
                };
            }

            if (campaignData) {
                // Ensure critical fields are set
                campaignData.title = title; // Explicitly set title from list API
                campaignData.card_name = card.cardName;
                campaignData.bank = 'Yapı Kredi'; // Enforce strict bank assignment

                // MAP FIELDS TO DB SCHEMA (SCRAPER_SCHEMA_GUIDE.md)
                campaignData.url = fullUrl;           // Mapping reference_url -> url
                campaignData.reference_url = fullUrl; // Keeping for upsert constraint
                campaignData.image = imageUrl;        // Mapping image_url -> image
                // campaignData.image_url = imageUrl; // Old field, removing to catch schema drift

                campaignData.category = campaignData.category || 'Diğer';
                campaignData.is_active = true;

                // Upsert to Supabase
                const { error } = await supabase
                    .from('campaigns')
                    .upsert(campaignData, { onConflict: 'reference_url' });

                if (error) {
                    console.error(`      ❌ Supabase Error: ${error.message}`);
                } else {
                    console.log(`      ✅ Saved to DB: ${campaignData.title}`);
                }
            }

        } catch (error: any) {
            console.error(`      ❌ Error processing campaign ${fullUrl}: ${error.message}`);
        }

        await sleep(1500); // Delay between details
    }
}

async function runYapikrediScraper() {
    console.log('🚀 Starting Unified Yapı Kredi Scraper...');
    const isAIEnabled = process.argv.includes('--ai');

    for (const card of CARDS) {
        await fetchCampaignsForCard(card, isAIEnabled);
        console.log(`\n✅ Finished ${card.name}. Waiting 5s before next card...\n`);
        await sleep(5000);
    }

    console.log('\n🏁 All Yapı Kredi campaigns processed successfully!');
}

runYapikrediScraper();
