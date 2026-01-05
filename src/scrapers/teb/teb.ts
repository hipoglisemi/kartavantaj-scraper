import 'dotenv/config';
import { supabase } from '../../utils/supabase';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import { normalizeBankName } from '../../utils/bankMapper';
import { lookupIDs } from '../../utils/idMapper';
import { downloadImageDirectly } from '../../services/imageService';
import { parseWithGemini } from '../../services/geminiParser';
import { syncEarningAndDiscount } from '../../utils/dataFixer';
import { assignBadge } from '../../services/badgeAssigner';
import { markGenericBrand } from '../../utils/genericDetector';

// Use Stealth Plugin
puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.teb.com.tr';
const CAMPAIGNS_URL = 'https://www.teb.com.tr/sizin-icin/kampanyalar/';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTebScraper() {
    console.log('🚀 Starting TEB Scraper...');

    const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 1000;

    let browser;
    const isCI = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true';

    if (!isCI) {
        try {
            console.log('   🔌 Connecting to Chrome debug instance on port 9222...');
            browser = await puppeteer.connect({
                browserURL: 'http://localhost:9222',
                defaultViewport: null
            });
            console.log('   ✅ Connected to existing Chrome instance');
        } catch (error) {
            console.log('   ⚠️  Could not connect to debug Chrome, launching new instance...');
        }
    }

    if (!browser) {
        console.log(`   🚀 Launching new browser instance (Headless: ${isCI})...`);
        browser = await puppeteer.launch({
            headless: isCI,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-position=-10000,0',
                '--disable-blink-features=AutomationControlled'
            ]
        });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        console.log(`   🔍 Loading Campaign List: ${CAMPAIGNS_URL}...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for cards to be visible
        await page.waitForSelector('.kContBox', { timeout: 10000 }).catch(() => console.log('   ⚠️  Cartlar bulunamadı, devam ediliyor...'));

        const content = await page.content();
        const $ = cheerio.load(content);
        let allLinks: string[] = [];

        $('.kContBox a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && !href.includes('javascript:') && href.length > 10) {
                let fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
                if (!allLinks.includes(fullUrl)) {
                    allLinks.push(fullUrl);
                }
            }
        });

        const uniqueLinks = [...new Set(allLinks)];
        console.log(`\n   🎉 Found ${uniqueLinks.length} unique campaigns. Processing first ${limit}...`);

        console.log(`   🔍 Normalizing bank name...`);
        const bankName = await normalizeBankName('TEB');
        console.log(`   ✅ Normalized bank: ${bankName}`);

        let count = 0;
        for (const url of uniqueLinks) {
            if (count >= limit) break;
            console.log(`   🔍 Processing [${count + 1}/${Math.min(uniqueLinks.length, limit)}]: ${url}`);

            try {
                await sleep(2000 + Math.random() * 2000);
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

                const detailContent = await page.content();
                const $d = cheerio.load(detailContent);

                // Selective Extraction
                const title = $d('h1').first().text().trim() || "Başlık Yok";
                if (title.length < 5) continue;

                // Image
                let image = "";
                const imgEl = $d('.detailImgHolder img').first();
                if (imgEl.length > 0) {
                    const src = imgEl.attr('src');
                    if (src) {
                        image = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                        // Not downloading directly as per user request
                    }
                }

                const cardName = 'TEB Genel';
                const fullPageText = $d('.subPageContent').text().trim() || $d.text().trim();

                const campaignHtml = `
                    <h1>${title}</h1>
                    <div class="full-text-context">${fullPageText}</div>
                    <img src="${image}" />
                `;

                const campaignData = await parseWithGemini(campaignHtml, url, bankName, cardName);

                if (campaignData) {
                    campaignData.title = title;
                    campaignData.image = null; // Don't use our storage
                    campaignData.image_url = image; // Use bank direct URL
                    campaignData.bank = bankName;
                    campaignData.card_name = cardName;
                    campaignData.url = url;
                    campaignData.reference_url = url;
                    campaignData.is_active = true;

                    syncEarningAndDiscount(campaignData);
                    campaignData.publish_status = 'processing';
                    campaignData.publish_updated_at = new Date().toISOString();

                    const ids = await lookupIDs(
                        campaignData.bank,
                        campaignData.card_name,
                        campaignData.brand,
                        campaignData.sector_slug,
                        campaignData.category
                    );

                    campaignData.bank_id = ids.bank_id || 'teb';
                    campaignData.card_id = ids.card_id || 'teb-genel';
                    if (ids.brand_id) campaignData.brand_id = ids.brand_id;
                    if (ids.sector_id) campaignData.sector_id = ids.sector_id;

                    const badge = assignBadge(campaignData);
                    campaignData.badge_text = badge.text;
                    campaignData.badge_color = badge.color;

                    markGenericBrand(campaignData);

                    count++;
                    console.log(`      [${count}] ${title.substring(0, 35)}... (Img: ${image ? '✅' : '❌'})`);

                    const { error } = await supabase
                        .from('campaigns')
                        .upsert(campaignData, { onConflict: 'reference_url' });

                    if (error) {
                        console.error(`      ❌ DB Error for "${title}": ${error.message}`);
                    } else {
                        console.log(`      ✅ Successfully saved/updated.`);
                    }
                }
            } catch (e: any) {
                console.error(`      ⚠️ Error processing ${url}:`, e.message);
            }
        }

        console.log(`\n✅ TEB Scraper Finished. Processed ${count} campaigns.`);

    } catch (e: any) {
        console.error('❌ Critical Error:', e);
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    runTebScraper();
}
