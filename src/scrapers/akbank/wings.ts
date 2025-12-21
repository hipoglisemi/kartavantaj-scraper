import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const CARD_CONFIG = {
    name: 'Wings', cardName: 'Wings', bank: 'Akbank',
    baseUrl: 'https://www.axess.com.tr',
    listApiUrl: 'https://www.axess.com.tr/ajax/kampanya-ajax-ticari.aspx',
    refererUrl: 'https://www.axess.com.tr/ticarikartlar/kampanya/8/450/kampanyalar',
    apiParams: { 'checkBox': '[0]', 'searchWord': '""' }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runWingsScraper() {
    console.log(`\n💳 ${CARD_CONFIG.name} (${CARD_CONFIG.bank})\n`);
    const isAIEnabled = process.argv.includes('--ai');
    let page = 1, allCampaigns: any[] = [];

    while (true) {
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
                if (href && !allCampaigns.some((c: any) => c.href === href)) {
                    allCampaigns.push({ href });
                    foundNew = true;
                }
            });
            console.log(`   ✅ Page ${page}: ${links.length} campaigns`);
            if (!foundNew && page > 1) break;
            page++;
            await sleep(1000);
        } catch (error: any) {
            console.error(`   ❌ ${error.message}`);
            break;
        }
    }

    console.log(`\n🎉 ${allCampaigns.length} campaigns. Processing...\n`);

    for (const item of allCampaigns) {
        const fullUrl = new URL(item.href, CARD_CONFIG.baseUrl).toString();
        console.log(`   🔍 ${fullUrl.substring(0, 50)}...`);
        try {
            const detailResponse = await axios.get(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const html = detailResponse.data;
            const $ = cheerio.load(html);
            const title = $('h2.pageTitle').text().trim() || 'Başlıksız';
            let campaignData;
            if (isAIEnabled) {
                campaignData = await parseWithGemini(html, fullUrl);
            } else {
                campaignData = { title, description: title, category: 'Diğer', sector_slug: 'diger', card_name: CARD_CONFIG.cardName, bank: CARD_CONFIG.bank, url: fullUrl, reference_url: fullUrl, is_active: true };
            }
            if (campaignData) {
                campaignData.title = title;
                campaignData.card_name = CARD_CONFIG.cardName;
                campaignData.bank = CARD_CONFIG.bank;
                campaignData.url = fullUrl;
                campaignData.reference_url = fullUrl;
                campaignData.category = campaignData.category || 'Diğer';
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

runWingsScraper();
