import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';
import { syncEarningAndDiscount } from '../../utils/dataFixer';
import { normalizeBankName, normalizeCardName } from '../../utils/bankMapper';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const CARD_CONFIG = {
    name: 'Axess Business',
    cardName: 'Business',
    bankName: 'Akbank',
    baseUrl: 'https://www.axess.com.tr',
    listApiUrl: 'https://www.axess.com.tr/ajax/kampanya-ajax-ticari.aspx',
    refererUrl: 'https://www.axess.com.tr/ticarikartlar/kampanya/8/451/axess-business-kampanyalari',
    apiParams: { 'checkBox': '[0]', 'searchWord': '""' }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runBusinessScraper() {
    const normalizedBank = await normalizeBankName(CARD_CONFIG.bankName);
    const normalizedCard = await normalizeCardName(normalizedBank, CARD_CONFIG.cardName);
    console.log(`\n💳 ${CARD_CONFIG.name} (${normalizedBank} - ${normalizedCard})\n`);
    const isAIEnabled = process.argv.includes('--ai');
    const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

    let page = 1, allCampaigns: any[] = [];

    while (allCampaigns.length < limit) {
        try {
            const response = await axios.get(CARD_CONFIG.listApiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': CARD_CONFIG.refererUrl,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                params: { ...CARD_CONFIG.apiParams, 'page': page.toString() }
            });
            const html = response.data;
            if (!html || html.trim() === '') break;
            const $ = cheerio.load(html);
            const links = $('.campaingBox a.dLink');
            if (links.length === 0) break;

            let newCount = 0;
            links.each((_: number, el: any) => {
                const href = $(el).attr('href');
                if (href && !allCampaigns.some((c: any) => c.href === href) && allCampaigns.length < limit) {
                    allCampaigns.push({ href });
                    newCount++;
                }
            });
            console.log(`   ✅ Page ${page}: ${links.length} campaigns (${newCount} new). Total: ${allCampaigns.length}`);

            if (allCampaigns.length >= limit) break;

            page++;
            await sleep(1000);

            // Limit pages to prevent infinite loops if something goes wrong, but usually it breaks on empty html or no links
            if (page > 10) break;
        } catch (error: any) {
            console.error(`   ❌ ${error.message}`);
            break;
        }
    }

    const campaignsToProcess = allCampaigns.slice(0, limit);
    console.log(`\n🎉 ${campaignsToProcess.length} campaigns. Processing...\n`);

    for (const item of campaignsToProcess) {
        const fullUrl = new URL(item.href, CARD_CONFIG.baseUrl).toString();
        console.log(`   🔍 ${fullUrl}`);
        try {
            const detailResponse = await axios.get(fullUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });
            const html = detailResponse.data;
            const $ = cheerio.load(html);
            const title = $('h2.pageTitle').text().trim() || $('.campaingDetail h3').first().text().trim() || 'Başlıksız';

            // Image Extraction
            const imagePath = $('.campaingDetailImage img').attr('src') || $('.campaingDetail img').first().attr('src');
            const imageUrl = imagePath ? new URL(imagePath, CARD_CONFIG.baseUrl).toString() : null;

            let campaignData;
            if (isAIEnabled) {
                campaignData = await parseWithGemini(html, fullUrl, normalizedBank, normalizedCard);
            } else {
                campaignData = {
                    title,
                    description: title,
                    category: 'Diğer',
                    sector_slug: 'diger',
                    card_name: CARD_CONFIG.cardName,
                    bank: normalizedBank,
                    url: fullUrl,
                    reference_url: fullUrl,
                    is_active: true
                };
            }
            if (campaignData) {
                campaignData.title = title;
                campaignData.image = imageUrl;
                campaignData.card_name = normalizedCard;
                campaignData.bank = normalizedBank;
                campaignData.url = fullUrl;
                campaignData.reference_url = fullUrl;
                campaignData.category = campaignData.category || 'Diğer';
                campaignData.sector_slug = generateSectorSlug(campaignData.category);
                syncEarningAndDiscount(campaignData);
                campaignData.is_active = true;

                if (campaignData.end_date) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const endDate = new Date(campaignData.end_date);
                    if (endDate < today) {
                        console.log(`      ⚠️  Expired (${campaignData.end_date}), skipping...`);
                        continue;
                    }
                }

                // Ensure min_spend has a default value to prevent DB constraint errors
                campaignData.min_spend = campaignData.min_spend || 0;

                const { error } = await supabase.from('campaigns').upsert(campaignData, { onConflict: 'reference_url' });
                if (error) {
                    console.error(`      ❌ Upsert Error for "${title}":`, JSON.stringify(error, null, 2));
                    console.error(`      Start of Failed Payload:`, JSON.stringify(campaignData, null, 2).substring(0, 200) + '...');
                } else {
                    console.log(`      🖼️  Image: ${imageUrl}`);
                    console.log(`      ✅ Saved: ${title}`);
                }
            }
        } catch (error: any) {
            console.error(`      ❌ ${error.message}`);
        }
        await sleep(1500);
    }
    console.log(`\n✅ Done!`);
}

runBusinessScraper();
