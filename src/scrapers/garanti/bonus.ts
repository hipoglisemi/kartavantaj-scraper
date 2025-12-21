
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
                    let fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

                    // Fix malformed URLs (e.g., https://www.bonus.com.tr../kampanyalar/...)
                    fullUrl = fullUrl.replace('com.tr//', 'com.tr/').replace('com.tr../', 'com.tr/');

                    // Normalize
                    try {
                        fullUrl = new URL(fullUrl).href;
                        if (!campaignLinks.includes(fullUrl)) {
                            campaignLinks.push(fullUrl);
                        }
                    } catch (e) {
                        // invalid url, skip
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
                const title = $detail('.campaign-detail-title h1').text().trim() ||
                    $detail('h1').first().text().trim() ||
                    $detail('title').text().replace('- Bonus', '').trim() ||
                    'Başlıksız Kampanya';
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
                        url: fullUrl,           // Mapped
                        reference_url: fullUrl, // Mapped
                        image: imageUrl || '',  // Mapped
                        category: 'Diğer',
                        sector_slug: 'diger',
                        is_active: true
                    };
                }

                if (campaignData) {
                    // Force fields
                    campaignData.card_name = 'Bonus'; // Default to Bonus, specific cards handled by AI if needed or generic override
                    campaignData.bank = 'Garanti BBVA'; // Enforce strict bank assignment

                    // MAP FIELDS TO DB SCHEMA (SCRAPER_SCHEMA_GUIDE.md)
                    campaignData.url = fullUrl;           // Mapping reference_url -> url
                    campaignData.reference_url = fullUrl; // Keeping for upsert constraint
                    campaignData.image = imageUrl;        // Mapping image_url -> image
                    // campaignData.image_url = imageUrl; // Removing old field

                    if (!campaignData.image && imageUrl) {
                        campaignData.image = imageUrl;
                    }
                    campaignData.is_active = true;

                    // Filter out expired campaigns if end_date exists
                    if (campaignData.end_date) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const endDate = new Date(campaignData.end_date);
                        if (endDate < today) {
                            console.log(`      ⚠️  Expired (${campaignData.end_date}), skipping...`);
                            continue;
                        }
                    }

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
