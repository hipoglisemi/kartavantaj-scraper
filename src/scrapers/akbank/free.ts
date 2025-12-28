import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';
import { syncEarningAndDiscount } from '../../utils/dataFixer';
import { normalizeBankName, normalizeCardName } from '../../utils/bankMapper';
import { lookupIDs } from '../../utils/idMapper';
import { assignBadge } from '../../services/badgeAssigner';
import { markGenericBrand } from '../../utils/genericDetector';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const CARD_CONFIG = {
    name: 'Free',
    cardName: 'Free',
    bankName: 'Akbank',
    baseUrl: 'https://www.kartfree.com',
    listApiUrl: 'https://www.kartfree.com/ajax/campaign-ajax-free.aspx',
    refererUrl: 'https://www.kartfree.com/free/kampanya/8/395/kampanyalar',
    apiParams: { 'checkBox': '[]', 'searchWord': '""' }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runFreeScraper() {
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
                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': CARD_CONFIG.refererUrl, 'X-Requested-With': 'XMLHttpRequest' },
                params: { ...CARD_CONFIG.apiParams, 'page': page.toString() }
            });
            const html = response.data;
            if (!html || html.trim() === '') break;
            const $ = cheerio.load(html);
            const links = $('.campaingBox a.dLink');
            if (links.length === 0) break;
            let foundNew = false;
            links.each((_: number, el: any) => {
                const href = $(el).attr('href');
                if (href && !allCampaigns.some((c: any) => c.href === href) && allCampaigns.length < limit) {
                    allCampaigns.push({ href });
                    foundNew = true;
                }
            });
            console.log(`   ✅ Page ${page}: ${links.length} campaigns. Total: ${allCampaigns.length}`);
            if ((!foundNew && page > 1) || allCampaigns.length >= limit) break;
            page++;
            await sleep(1000);
        } catch (error: any) {
            console.error(`   ❌ ${error.message}`);
            break;
        }
    }

    const campaignsToProcess = allCampaigns.slice(0, limit);
    console.log(`\n🎉 ${campaignsToProcess.length} campaigns. Processing...\n`);

    for (const item of campaignsToProcess) {
        const fullUrl = new URL(item.href, CARD_CONFIG.baseUrl).toString();
        console.log(`   🔍 ${fullUrl.substring(0, 50)}...`);
        try {
            const detailResponse = await axios.get(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const html = detailResponse.data;
            const $ = cheerio.load(html);
            const title = $('h2.pageTitle').text().trim() || 'Başlıksız';

            // Image Extraction
            const imagePath = $('.campaingDetailImage img').attr('src');
            const imageUrl = imagePath ? new URL(imagePath, CARD_CONFIG.baseUrl).toString() : null;

            let campaignData;
            if (isAIEnabled) {
                campaignData = await parseWithGemini(html, fullUrl, normalizedBank, normalizedCard);
            } else {
                campaignData = { title, description: title, category: 'Diğer', sector_slug: 'diger', card_name: normalizedCard, bank: normalizedBank, url: fullUrl, reference_url: fullUrl, is_active: true };
            }
            if (campaignData) {
                campaignData.title = title;
                campaignData.image = imageUrl; // Add extracted image
                campaignData.card_name = normalizedCard;
                campaignData.bank = normalizedBank;
                campaignData.url = fullUrl;
                campaignData.reference_url = fullUrl;
                campaignData.category = campaignData.category || 'Diğer';
                campaignData.sector_slug = generateSectorSlug(campaignData.category);
                syncEarningAndDiscount(campaignData);
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

                const { error } = await supabase.from('campaigns').upsert(campaignData, { onConflict: 'reference_url' });
                if (error) console.error(`      ❌ ${error.message}`);
                else console.log(`      ✅ Saved`);
            }
        } catch (error: any) {
            console.error(`      ❌ ${error.message}`);
        }
        await sleep(1500);
    }
    console.log(`\n✅ Done!`);
}

runFreeScraper();
