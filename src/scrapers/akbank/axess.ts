
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';
import { syncEarningAndDiscount } from '../../utils/dataFixer';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const CARD_CONFIG = {
    name: 'Axess',
    cardName: 'Axess',
    bank: 'Akbank',
    baseUrl: 'https://www.axess.com.tr',
    listApiUrl: 'https://www.axess.com.tr/ajax/kampanya-ajax.aspx',
    refererUrl: 'https://www.axess.com.tr/kampanyalar',
    apiParams: { 'checkBox': '[0]', 'searchWord': '""' },
    detailSelector: '.cmsContent.clearfix'
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runAxessScraper() {
    console.log(`\n💳 Starting ${CARD_CONFIG.name} Card Scraper...`);
    console.log(`   Bank: ${CARD_CONFIG.bank}`);
    console.log(`   Source: ${CARD_CONFIG.baseUrl}\n`);

    const isAIEnabled = process.argv.includes('--ai');
    let page = 1;
    let allCampaigns: any[] = [];

    // 1. Fetch List from API
    while (true) {
        try {
            console.log(`   📄 Fetching page ${page}...`);
            const response = await axios.get(CARD_CONFIG.listApiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': CARD_CONFIG.refererUrl,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                params: {
                    ...CARD_CONFIG.apiParams,
                    'page': page.toString()
                }
            });

            const html = response.data;
            if (!html || html.trim() === '') {
                console.log(`   ✅ Page ${page} is empty. Finished.`);
                break;
            }

            const $ = cheerio.load(html);
            const links = $('.campaingBox a.dLink');

            if (links.length === 0) {
                console.log(`   ✅ No more campaigns. Finished.`);
                break;
            }

            let foundNew = false;
            links.each((_: number, el: any) => {
                const href = $(el).attr('href');
                if (href) {
                    const exists = allCampaigns.some((c: any) => c.href === href);
                    if (!exists) {
                        allCampaigns.push({ href });
                        foundNew = true;
                    }
                }
            });

            console.log(`   ✅ Found ${links.length} campaigns on page ${page}.`);

            if (!foundNew && page > 1) {
                console.log('   ⚠️ No new campaigns. Stopping.');
                break;
            }

            page++;
            await sleep(1000);
        } catch (error: any) {
            console.error(`   ❌ Error: ${error.message}`);
            break;
        }
    }

    console.log(`\n🎉 Total ${allCampaigns.length} campaigns found. Processing details...\n`);

    // 2. Process Details
    for (const item of allCampaigns) {
        const urlPart = item.href;
        if (!urlPart) continue;

        const fullUrl = new URL(urlPart, CARD_CONFIG.baseUrl).toString();
        console.log(`   🔍 Fetching: ${fullUrl.substring(0, 60)}...`);

        try {
            const detailResponse = await axios.get(fullUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            const html = detailResponse.data;
            const $ = cheerio.load(html);

            const title = $('h2.pageTitle').text().trim() || 'Başlıksız Kampanya';

            // AI Parsing
            let campaignData;
            if (isAIEnabled) {
                campaignData = await parseWithGemini(html, fullUrl);
            } else {
                campaignData = {
                    title: title,
                    description: title,
                    category: 'Diğer',
                    sector_slug: 'diger',
                    card_name: CARD_CONFIG.cardName,
                    bank: CARD_CONFIG.bank,
                    url: fullUrl,
                    reference_url: fullUrl,
                    is_active: true
                };
            }

            if (campaignData) {
                // STRICT ASSIGNMENT
                campaignData.title = title;
                campaignData.card_name = CARD_CONFIG.cardName;
                campaignData.bank = CARD_CONFIG.bank;
                campaignData.url = fullUrl;
                campaignData.reference_url = fullUrl;
                campaignData.category = campaignData.category || 'Diğer';
                campaignData.sector_slug = generateSectorSlug(campaignData.category);
                syncEarningAndDiscount(campaignData);
                campaignData.is_active = true;

                // Check for activity if end_date exists
                if (campaignData.end_date) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const endDate = new Date(campaignData.end_date);
                    if (endDate < today) {
                        console.log(`      ⚠️  Expired (${campaignData.end_date}), skipping...`);
                        continue;
                    }
                }

                const { error } = await supabase
                    .from('campaigns')
                    .upsert(campaignData, { onConflict: 'reference_url' });

                if (error) {
                    console.error(`      ❌ Error: ${error.message}`);
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

runAxessScraper();
