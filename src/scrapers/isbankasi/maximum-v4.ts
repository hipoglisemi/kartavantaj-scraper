import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';
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

const CARD_CONFIG = {
    name: 'Maximum',
    cardName: 'Maximum',
    bankName: 'İş Bankası',
    baseUrl: 'https://www.maximum.com.tr'
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function processMaximumLinks() {
    const normalizedBank = await normalizeBankName(CARD_CONFIG.bankName);
    const normalizedCard = await normalizeCardName(normalizedBank, CARD_CONFIG.cardName);
    console.log(`\n💳 Maximum Link Processor (TypeScript)...`);
    console.log(`   Bank: ${normalizedBank}`);
    console.log(`   Card: ${normalizedCard}\n`);

    // Read links from Python output
    const linksPath = path.join(process.cwd(), 'maximum_links.json');
    if (!fs.existsSync(linksPath)) {
        console.error('❌ maximum_links.json not found! Run Python scraper first.');
        return;
    }

    const links: string[] = JSON.parse(fs.readFileSync(linksPath, 'utf8'));
    console.log(`📋 Loaded ${links.length} links from Python scraper\n`);

    // Optimize
    console.log(`   🔍 Optimizing via database check...`);
    const { urlsToProcess } = await optimizeCampaigns(links, normalizedCard);
    console.log(`   🚀 Processing ${urlsToProcess.length} campaigns (skipping ${links.length - urlsToProcess.length} existing)...\n`);

    // Process each link
    for (const url of urlsToProcess) {
        console.log(`   🔍 ${url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('/') + 40)}...`);

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            const html = response.data;
            const $ = cheerio.load(html);

            // Extract details
            const title = $('h1.gradient-title-text, h1').first().text().trim() || 'Başlıksız';

            // Image (try multiple selectors)
            let image = $('meta[property="og:image"]').attr('content') || '';
            if (!image) {
                const imgEl = $('img[id$="CampaignImage"]');
                image = imgEl.attr('src') || '';
            }
            if (image && !image.startsWith('http')) {
                image = new URL(image, CARD_CONFIG.baseUrl).toString();
            }

            // Description & Conditions
            const descEl = $('span[id$="CampaignDescription"]');
            let rawText = descEl.text().trim();
            let conditions: string[] = [];
            if (rawText) {
                conditions = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 20);
            }

            console.log(`      🖼️  Image: ${image ? '✅' : '❌'}`);

            // AI Processing
            let campaignData: any = {};
            try {
                console.log(`      🧠 AI processing...`);
                campaignData = await parseWithGemini(html, url, normalizedBank, normalizedCard);
            } catch (err: any) {
                console.error(`      ⚠️  AI Error: ${err.message}`);
                campaignData = { title, description: title, category: 'Diğer' };
            }

            // Merge data
            campaignData.title = title;
            campaignData.image = image;
            campaignData.card_name = normalizedCard;
            campaignData.bank = normalizedBank;
            campaignData.url = url;
            campaignData.reference_url = url;
            campaignData.category = campaignData.category || 'Diğer';
            campaignData.sector_slug = generateSectorSlug(campaignData.category);
            campaignData.conditions = (conditions && conditions.length > 0) ? conditions : (campaignData.conditions || []);
            campaignData.is_active = true;
            campaignData.min_spend = campaignData.min_spend || 0;

            // Lookup IDs
            const ids = await lookupIDs(
                campaignData.bank,
                campaignData.card_name,
                campaignData.brand,
                campaignData.sector_slug
            );
            Object.assign(campaignData, ids);

            // Assign badge
            const badge = assignBadge(campaignData);
            campaignData.badge_text = badge.text;
            campaignData.badge_color = badge.color;
            markGenericBrand(campaignData);

            // Save
            const { error } = await supabase
                .from('campaigns')
                .upsert(campaignData, { onConflict: 'reference_url' });

            if (error) {
                console.error(`      ❌ DB Error: ${error.message}`);
            } else {
                console.log(`      ✅ Saved`);
            }

        } catch (error: any) {
            console.error(`      ❌ Error: ${error.message}`);
        }

        await sleep(1500);
    }

    console.log(`\n✅ Maximum processing completed!`);
}

processMaximumLinks();
