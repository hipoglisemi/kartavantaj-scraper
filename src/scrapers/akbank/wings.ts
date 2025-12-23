import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';
import { syncEarningAndDiscount } from '../../utils/dataFixer';
import { normalizeBankName } from '../../utils/bankMapper';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const CARD_CONFIG = {
    name: 'Wings',
    cardName: 'Wings',
    bankName: 'Akbank',
    baseUrl: 'https://www.wingscard.com.tr',
    listApiUrl: 'https://www.wingscard.com.tr/api/campaign/list',
    refererUrl: 'https://www.wingscard.com.tr/kampanyalar'
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runWingsScraper() {
    const normalizedBank = await normalizeBankName(CARD_CONFIG.bankName);
    console.log(`\n💳 ${CARD_CONFIG.name} (${normalizedBank})\n`);
    const isAIEnabled = process.argv.includes('--ai');
    const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

    let page = 1, allCampaigns: any[] = [];

    while (allCampaigns.length < limit) {
        try {
            console.log(`   Fetching page ${page}...`);
            const response = await axios.get(CARD_CONFIG.listApiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': CARD_CONFIG.refererUrl
                },
                params: {
                    keyword: '',
                    sector: '',
                    category: '',
                    page: page.toString()
                }
            });

            const data = response.data;
            if (!data || !data.status || !data.data || !data.data.list || data.data.list.length === 0) {
                console.log('   No more campaigns found.');
                break;
            }

            const campaigns = data.data.list;
            let newCount = 0;
            for (const campaign of campaigns) {
                if (allCampaigns.length >= limit) break;
                // The API likely returns a slug or ID. Wings detail pages use slugs. 
                // Let's assume the API returns 'url' or 'slug'.
                // If it's like Axess, it might be /kampanyalar/kampanya-detay/abc
                const detailPath = campaign.url || `/kampanyalar/kampanya-detay/${campaign.slug}`;
                if (!allCampaigns.some(c => c.href === detailPath)) {
                    allCampaigns.push({ href: detailPath, title: campaign.title });
                    newCount++;
                }
            }
            console.log(`   ✅ Page ${page}: ${campaigns.length} campaigns (${newCount} new). Total: ${allCampaigns.length}`);

            if (allCampaigns.length >= data.data.totalCount || allCampaigns.length >= limit) break;

            page++;
            await sleep(1000);
            if (page > 20) break; // Safety limit
        } catch (error: any) {
            console.error(`   ❌ Error fetching list: ${error.message}`);
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

            // Wings detail page structure analysis from research:
            // Title: h1.banner-title or similar.
            const title = $('h1.banner-title').text().trim() || item.title || 'Başlıksız';

            // Image: Wings doesn't use specific classes, but campaign images are in /api/uploads/
            // Get first image that's from uploads (excluding logo.svg)
            let imageUrl: string | null = null;
            $('img').each((_, el) => {
                const src = $(el).attr('src');
                if (src && src.includes('/api/uploads/') && !src.includes('logo')) {
                    imageUrl = new URL(src, CARD_CONFIG.baseUrl).toString();
                    return false; // break
                }
            });

            let campaignData;
            if (isAIEnabled) {
                campaignData = await parseWithGemini(html, fullUrl, 'Akbank');
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
                campaignData.card_name = CARD_CONFIG.cardName;
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

                const { error } = await supabase.from('campaigns').upsert(campaignData, { onConflict: 'reference_url' });
                if (error) console.error(`      ❌ ${error.message}`);
                else {
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

runWingsScraper();
