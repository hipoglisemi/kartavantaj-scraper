
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as cheerio from 'cheerio'; // Cheerio for fast parsing like BeautifulSoup
import {
    getCategory,
    extractMerchant,
    cleanText,
    formatDateIso,
    extractFinancialsV8,
    extractParticipation,
    extractCardsPrecise,
    trLower
} from '../../utils/MaximumHelpers';
import { normalizeBankName, normalizeCardName } from '../../utils/bankMapper';
import { generateSectorSlug } from '../../utils/slugify';

dotenv.config();

// Use Stealth Plugin
puppeteer.use(StealthPlugin());

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BASE_URL = 'https://www.maximum.com.tr';
const CAMPAIGNS_URL = 'https://www.maximum.com.tr/kampanyalar';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runMaximumScraperTS() {
    console.log('🚀 Starting İş Bankası (Maximum) Scraper (TS Stealth + V8 Engine)...');

    // Parse limit argument
    const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 1000;

    const browser = await puppeteer.launch({
        headless: true, // Start headless
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-position=-10000,0', // Move window offscreen if headful
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await browser.newPage();
    // Simulate typical desktop view
    await page.setViewport({ width: 1400, height: 900 });

    // --- STEALTH HEADERS & EVASION (Ported from wings.ts) ---
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
    });

    await page.evaluateOnNewDocument(() => {
        // @ts-ignore
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    try {
        console.log(`   🔍 Loading Campaign List: ${CAMPAIGNS_URL}...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(5000);

        // --- INFINITE SCROLL LOGIC ---
        let hasMore = true;
        while (hasMore) {
            try {
                // Find and click "Daha Fazla" button
                const btnFound = await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const loadMore = btns.find(b => b.innerText.includes('Daha Fazla'));
                    if (loadMore) {
                        loadMore.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        return loadMore; // signal existence
                    }
                    return null;
                });

                if (btnFound) {
                    await sleep(1000);
                    await page.click('button::-p-text(Daha Fazla)'); // Puppeteer pseudo-selector or use eval click
                    // Re-implement robust click as evaluate might fail with stealth contexts sometimes
                    await page.evaluate(() => {
                        const btns = Array.from(document.querySelectorAll('button'));
                        const loadMore = btns.find(b => b.innerText.includes('Daha Fazla'));
                        if (loadMore) (loadMore as HTMLElement).click();
                    });

                    process.stdout.write('.');
                    await sleep(2500); // 2.5s wait as per Python script
                } else {
                    console.log('\n      ✅ All list loaded.');
                    hasMore = false;
                }
            } catch (e) {
                hasMore = false;
            }
        }

        // --- EXTRACT LINKS ---
        const content = await page.content();
        const $ = cheerio.load(content);
        let allLinks: string[] = [];

        $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('/kampanyalar/') && !href.includes('arsiv') && href.length > 25) {
                allLinks.push(href.startsWith('http') ? href : `${BASE_URL}${href}`); // Handle relative URLs
            }
        });

        const uniqueLinks = [...new Set(allLinks)];
        console.log(`\n   🎉 Found ${uniqueLinks.length} unique campaigns. Processing...`);

        const bankName = await normalizeBankName('İş Bankası');

        let count = 0;
        for (const url of uniqueLinks) {
            if (count >= limit) break;

            try {
                await sleep(1500); // 1.5s delay
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // 🔥 VISUAL V7 TACTIC: SCROLL
                await page.evaluate(() => window.scrollTo(0, 600));
                await sleep(500);

                // Wait for description (optional presence check like in Python)
                try {
                    await page.waitForSelector("span[id$='CampaignDescription']", { timeout: 5000 });
                } catch { }

                const detailContent = await page.content();
                const $d = cheerio.load(detailContent);

                const titleEl = $d('h1.gradient-title-text').first() || $d('h1').first();
                const title = cleanText(titleEl.text() || "Başlık Yok");

                if (trLower(title).includes('geçmiş') || title.length < 10) continue;

                // Dates
                const dateEl = $d("span[id$='KampanyaTarihleri']");
                const dateText = cleanText(dateEl.text());
                const validUntil = formatDateIso(dateText, true);

                if (validUntil && new Date(validUntil) < new Date()) continue; // Expired

                // Description & Conditions
                const descEl = $d("span[id$='CampaignDescription']");
                let conditions: string[] = [];
                let fullText = "";

                if (descEl.length > 0) {
                    // Mimic Python's br -> newline replacement
                    descEl.find('br').replaceWith('\n');
                    descEl.find('p').prepend('\n');
                    const rawText = descEl.text();
                    conditions = rawText.split('\n').map(line => cleanText(line)).filter(l => l.length > 15);
                    fullText = conditions.join(' ');
                } else {
                    fullText = cleanText($d.text());
                    conditions = fullText.split('\n').filter(t => t.length > 20);
                }

                // 🔥 VISUAL V7 TACTIC: ID SELECTOR FOR IMAGE
                let image = "";
                const imgEl = $d("img[id$='CampaignImage']");
                if (imgEl.length > 0) {
                    const src = imgEl.attr('src');
                    if (src) image = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                }

                // V8 Logic Extraction
                const cat = getCategory(title, fullText);
                const merchant = extractMerchant(title);
                const { minS, earn, disc, maxD } = extractFinancialsV8(fullText, title);
                const cards = extractCardsPrecise(fullText);
                const participationMethod = extractParticipation(fullText);
                const sectorSlug = generateSectorSlug(cat);

                // Determine Best Card Name
                let cardName = 'Maximum';
                if (cards.length > 0) {
                    if (cards.includes('Maximum Kart')) cardName = 'Maximum';
                    else cardName = cards[0];
                }
                const normalizedCardNameVal = await normalizeCardName(bankName, cardName);

                count++;

                const imgStatus = image ? '✅' : '❌';
                console.log(`      [${count}] ${title.substring(0, 35)}... (M:${minS} E:${earn || 'None'} Img:${imgStatus})`);

                const campaignData = {
                    bank: bankName,
                    card_name: normalizedCardNameVal,
                    title: title,
                    description: conditions[0] || title,
                    image: image,
                    url: url,
                    reference_url: url,
                    category: cat,
                    sector_slug: sectorSlug,
                    valid_until: validUntil,
                    min_spend: minS,
                    max_discount: maxD,
                    discount: disc, // Mapped from 'disc' (installments)
                    earning: earn, // Mapped from 'earn' (e.g. 100 TL Puan)
                    conditions: conditions.join('\n'),
                    participation_method: participationMethod,
                    is_active: true,
                };

                // DB Upsert
                const { error } = await supabase
                    .from('campaigns')
                    .upsert(campaignData, { onConflict: 'reference_url' });

                if (error) {
                    console.error(`      ❌ DB Error: ${error.message}`);
                }

            } catch (e: any) {
                console.error(`      ⚠️ Error processing ${url}:`, e.message);
            }
        }

        console.log(`\n✅ TS Scraper Finished. Processed ${count} campaigns.`);

    } catch (e: any) {
        console.error('❌ Critical Error:', e);
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    runMaximumScraperTS();
}
