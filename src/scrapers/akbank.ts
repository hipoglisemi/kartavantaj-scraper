
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
    refererUrl: string;
    apiParams: Record<string, string>;
    detailSelector: string;
}

const CARDS: CardConfig[] = [
    {
        name: 'Axess',
        cardName: 'Axess',
        baseUrl: 'https://www.axess.com.tr',
        listApiUrl: 'https://www.axess.com.tr/ajax/kampanya-ajax.aspx',
        refererUrl: 'https://www.axess.com.tr/kampanyalar',
        apiParams: { 'checkBox': '[0]', 'searchWord': '""' },
        detailSelector: '.cmsContent.clearfix'
    },
    {
        name: 'Free',
        cardName: 'Free',
        baseUrl: 'https://www.kartfree.com',
        listApiUrl: 'https://www.kartfree.com/ajax/kampanya-ajax-free.aspx',
        refererUrl: 'https://www.kartfree.com/free/kampanya/8/395/kampanyalar',
        apiParams: { 'checkBox': '[]', 'searchWord': '""' },
        detailSelector: '.cmsContent.clearfix'
    },
    {
        name: 'Wings / Ticari',
        cardName: 'Wings', // Or 'Ticari' depending on preference
        baseUrl: 'https://www.axess.com.tr',
        listApiUrl: 'https://www.axess.com.tr/ajax/kampanya-ajax-ticari.aspx',
        refererUrl: 'https://www.axess.com.tr/ticarikartlar/kampanya/8/450/kampanyalar',
        apiParams: { 'checkBox': '[0]', 'searchWord': '""' },
        detailSelector: '.cmsContent.clearfix'
    }
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchCampaignsForCard(card: CardConfig, isAIEnabled: boolean) {
    console.log(`\n🎻 Starting scraper for: ${card.name} (${card.cardName})...`);
    console.log(`   Source: ${card.baseUrl}`);

    let page = 1;
    let allCampaigns: any[] = [];

    // 1. Fetch List from API
    while (true) {
        try {
            console.log(`   📄 Fetching page ${page}...`);
            const response = await axios.get(card.listApiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': card.refererUrl,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                params: {
                    ...card.apiParams,
                    'page': page.toString()
                }
            });

            const html = response.data;
            if (!html || html.trim() === '') {
                console.log(`   ✅ Page ${page} is empty (empty response). Finished fetching list.`);
                break;
            }

            // The API returns HTML snippets, not JSON
            const $ = cheerio.load(html);
            const links = $('.campaingBox a.dLink');

            if (links.length === 0) {
                console.log(`   ✅ Page ${page} is empty (no links). Finished fetching list.`);
                break;
            }

            let foundNew = false;
            links.each((_: number, el: any) => {
                const href = $(el).attr('href');
                if (href) {
                    // Check if we already have this URL in the current batch to avoid infinite loops if pagination is broken
                    const exists = allCampaigns.some((c: any) => c.href === href);
                    if (!exists) {
                        allCampaigns.push({ href });
                        foundNew = true;
                    }
                }
            });

            console.log(`   ✅ Found ${links.length} campaigns on page ${page}.`);

            if (!foundNew && page > 1) {
                console.log('   ⚠️ No new campaigns found (pagination repeated?). Stopping.');
                break;
            }

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
        const urlPart = item.href;
        if (!urlPart) continue;

        const fullUrl = new URL(urlPart, card.baseUrl).toString();

        console.log(`\n   🔍 Fetching details for: ${fullUrl}...`);

        try {
            // Fetch Detail Page HTML
            const detailResponse = await axios.get(fullUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const html = detailResponse.data;
            const $ = cheerio.load(html);

            const title = $(card.name === 'Free' ? 'h2.pageTitle' : 'h2.pageTitle').text().trim() || 'Başlıksız Kampanya';

            // Extract content for AI
            let contentText = $(card.detailSelector).text().trim();

            // Fallback for content
            if (!contentText || contentText.length < 50) {
                contentText = $('body').text().trim().substring(0, 2000);
            }

            // Extract image (fallback if AI doesn't find one better)
            let imageUrl = $('.campaingDetailImage img').attr('src');
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = new URL(imageUrl, card.baseUrl).toString();
            }

            // AI Parsing
            let campaignData;
            if (isAIEnabled) {
                campaignData = await parseWithGemini(html, fullUrl);
            } else {
                // Basic parsing if AI is disabled
                campaignData = {
                    title: title,
                    description: title,
                    card_name: card.cardName,
                    url: fullUrl,
                    reference_url: fullUrl,
                    image: imageUrl || '',
                    is_active: true,
                    category: 'Diğer'
                };
            }

            if (campaignData) {
                // Ensure critical fields are set
                campaignData.card_name = card.cardName; // Enforce card name from config

                // MAP FIELDS TO DB SCHEMA
                campaignData.url = fullUrl;
                campaignData.reference_url = fullUrl;
                campaignData.image = imageUrl;
                // campaignData.image_url = imageUrl; 

                if (!campaignData.image && imageUrl) {
                    campaignData.image = imageUrl;
                }

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

async function runAkbankScraper() {
    console.log('🚀 Starting Unified Akbank Scraper (Axess, Free, Wings/Ticari)...');
    const isAIEnabled = process.argv.includes('--ai');

    for (const card of CARDS) {
        await fetchCampaignsForCard(card, isAIEnabled);
        console.log(`\n✅ Finished ${card.name}. Waiting 5s before next card...\n`);
        await sleep(5000);
    }

    console.log('\n🏁 All Akbank campaigns processed successfully!');
}

runAkbankScraper();
