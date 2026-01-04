
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';
import { syncEarningAndDiscount } from '../../utils/dataFixer';
import { normalizeBankName, normalizeCardName } from '../../utils/bankMapper';
import { optimizeCampaigns } from '../../utils/campaignOptimizer';
import { lookupIDs } from '../../utils/idMapper';
import { assignBadge } from '../../services/badgeAssigner';
import { markGenericBrand } from '../../utils/genericDetector';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BASE_URL = 'https://www.denizbonus.com';
const CAMPAIGNS_URL = 'https://www.denizbonus.com/bonus-kampanyalari';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runDenizBonusScraper() {
    console.log('🚀 Starting Denizbank (DenizBonus) Scraper...');
    const normalizedBank = await normalizeBankName('Denizbank');
    const normalizedCard = await normalizeCardName(normalizedBank, 'DenizBonus');
    console.log(`   Bank: ${normalizedBank}, Card: ${normalizedCard}`);
    const isAIEnabled = process.argv.includes('--ai');

    // Parse limit argument
    const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 1000;

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
            // Match both '/kampanyalar/' and 'kampanyalar/' (relative paths)
            if (href && (href.includes('/kampanyalar/') || href.startsWith('kampanyalar/')) && href.split('/').length > 1) {
                // Filter out irrelevant links
                if (!['sektor', 'kategori', 'marka', '#', 'javascript', 'bonus-kampanyalari', 'biten-kampanyalar'].some(x => href.includes(x))) {
                    let fullUrl = href.startsWith('http') ? href : `${BASE_URL}/${href.replace(/^\//, '')}`;

                    // Fix malformed URLs
                    fullUrl = fullUrl.replace('com//', 'com/').replace('com../', 'com/');

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

        console.log(`\n   🎉 Found ${campaignLinks.length} campaigns via scraping.`);

        // Apply limit
        const limitedLinks = limit > 0 ? campaignLinks.slice(0, limit) : campaignLinks;
        console.log(`   🎯 Processing ${limitedLinks.length} campaigns (limit: ${limit})...`);

        // 2. Optimize
        console.log(`   🔍 Optimizing campaign list via database check...`);
        const { urlsToProcess } = await optimizeCampaigns(limitedLinks, normalizedCard);

        console.log(`   🚀 Processing details for ${urlsToProcess.length} campaigns (skipping ${limitedLinks.length - urlsToProcess.length} complete/existing)...\n`);

        // 3. Process Details
        let processedCount = 0;
        for (const fullUrl of urlsToProcess) {
            console.log(`\n   🔍 Processing [${++processedCount}/${urlsToProcess.length}]: ${fullUrl}`);

            try {
                const detailResponse = await axios.get(fullUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    timeout: 40000 // Increased from 20000ms
                });

                const html = detailResponse.data;
                const $detail = cheerio.load(html);

                // Extract basic info for fallback
                const title = $detail('h1').first().text().trim() ||
                    $detail('title').text().replace('- DenizBonus', '').trim() ||
                    'Başlıksız Kampanya';

                let imageUrl = $detail('img[src*="kampanya"]').first().attr('src') ||
                    $detail('.campaign-image img').attr('src') ||
                    $detail('img').first().attr('src');

                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = `${BASE_URL}${imageUrl}`;
                }

                // AI Parsing
                let campaignData;
                if (isAIEnabled) {
                    campaignData = await parseWithGemini(html, fullUrl, normalizedBank, normalizedCard);
                } else {
                    campaignData = {
                        title: title,
                        description: title,
                        card_name: normalizedCard,
                        url: fullUrl,
                        reference_url: fullUrl,
                        image: imageUrl || '',
                        category: 'Diğer',
                        sector_slug: 'diger',
                        is_active: true
                    };
                }

                if (campaignData) {
                    // Force fields
                    campaignData.title = title;
                    campaignData.card_name = normalizedCard;
                    campaignData.bank = normalizedBank;

                    // MAP FIELDS TO DB SCHEMA
                    campaignData.url = fullUrl;
                    campaignData.reference_url = fullUrl;
                    campaignData.image = imageUrl;

                    if (!campaignData.image && imageUrl) {
                        campaignData.image = imageUrl;
                    }
                    campaignData.category = campaignData.category || 'Diğer';
                    campaignData.sector_slug = generateSectorSlug(campaignData.category);
                    syncEarningAndDiscount(campaignData);
                    campaignData.publish_status = 'processing';
                    campaignData.publish_updated_at = new Date().toISOString();
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

                    campaignData.min_spend = campaignData.min_spend || 0;

                    // Lookup and assign IDs from master tables
                    const ids = await lookupIDs(
                        campaignData.bank,
                        campaignData.card_name,
                        campaignData.brand,
                        campaignData.sector_slug
                    );
                    Object.assign(campaignData, ids);

                    // Assign badge based on campaign content
                    const badge = assignBadge(campaignData);
                    campaignData.badge_text = badge.text;
                    campaignData.badge_color = badge.color;

                    // Mark as generic if it's a non-brand-specific campaign
                    markGenericBrand(campaignData);

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

        console.log(`\n✅ DenizBonus Scraper Finished. Processed ${processedCount} campaigns.`);

    } catch (error: any) {
        console.error(`❌ Global Error: ${error.message}`);
    }
}

runDenizBonusScraper();
