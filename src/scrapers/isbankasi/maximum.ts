
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
import { lookupIDs } from '../../utils/idMapper';
import { generateSectorSlug } from '../../utils/slugify';
import { downloadImageDirectly } from '../../services/imageService';

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

    // Connect to existing Chrome instance running in debug mode (Local only)
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
    // Simulate typical desktop view
    await page.setViewport({ width: 1400, height: 900 });

    // --- STEALTH HEADERS ---
    // --- STEALTH HEADERS ---
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

    await page.setUserAgent(randomUA);
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'tr-TR,tr;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
    });

    await page.evaluateOnNewDocument(() => {
        // @ts-ignore
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // @ts-ignore
        navigator.languages = ['tr-TR', 'tr', 'en-US', 'en'];
    });

    try {
        console.log(`   🔍 Loading Campaign List: ${CAMPAIGNS_URL}...`);

        let listLoaded = false;
        let listRetries = 0;
        const maxListRetries = 10;

        while (!listLoaded && listRetries < maxListRetries) {
            try {
                // Using networkidle2 for more stability, and a shorter timeout per attempt to fail fast and retry
                await page.goto(CAMPAIGNS_URL, { waitUntil: 'networkidle2', timeout: 45000 });
                listLoaded = true;
            } catch (e: any) {
                listRetries++;
                const backoff = Math.min(listRetries * 5000, 30000);
                console.log(`      ⚠️  List load attempt ${listRetries}/${maxListRetries} failed: ${e.message}. Retrying in ${backoff / 1000}s...`);
                await sleep(backoff);
                // Rotate UA on retry
                await page.setUserAgent(userAgents[listRetries % userAgents.length]);
            }
        }

        if (!listLoaded) throw new Error(`Could not load campaign list after ${maxListRetries} attempts`);

        await sleep(3000); // Small wait after networkidle2 

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
                        return true;
                    }
                    return false;
                });

                if (btnFound) {
                    await sleep(1000);
                    // Re-implement robust click
                    const clicked = await page.evaluate(() => {
                        const btns = Array.from(document.querySelectorAll('button'));
                        const loadMore = btns.find(b => b.innerText.includes('Daha Fazla'));
                        if (loadMore) {
                            (loadMore as HTMLElement).click();
                            return true;
                        }
                        return false;
                    });

                    if (clicked) {
                        process.stdout.write('.');
                        await sleep(3000); // Wait for content load
                    } else {
                        hasMore = false;
                    }
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

        // Category keywords to exclude (based on actual Maximum categories)
        const categoryKeywords = [
            'kampanyalari', 'kampanyalar/', 'kategoriler',
            'seyahat', 'turizm', 'akaryakit', 'giyim-aksesuar',
            'market', 'elektronik', 'beyaz-esya', 'mobilya-dekorasyon',
            'egitim-kirtasiye', 'online-alisveris', 'otomotiv',
            'vergi-odemeleri', 'maximum-mobil', 'diger', 'yeme-icme',
            'maximum-pati-kart', 'arac-kiralama', 'bankamatik',
            'tum-kampanyalar', 'son-kampanyalar'
        ];

        $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && (href.includes('/kampanyalar/') || href.includes('kampanyalar/')) && !href.includes('arsiv')) {
                // Skip if it's a category page
                const isCategoryPage = categoryKeywords.some(keyword =>
                    href.toLowerCase().includes(keyword.toLowerCase())
                );

                // Only include if it's a real campaign (has ID-like structure, longer URL)
                // Real campaigns have long alphanumeric IDs, categories are short descriptive names
                const urlParts = href.split('/');
                const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
                const looksLikeCampaignId = lastPart.length > 40 || /^[A-Z0-9]{10,}$/i.test(lastPart);

                if (!isCategoryPage && looksLikeCampaignId && href.length > 20) {
                    let fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
                    if (!allLinks.includes(fullUrl)) {
                        allLinks.push(fullUrl);
                    }
                }
            }
        });

        const uniqueLinks = [...new Set(allLinks)];
        console.log(`\n   🎉 Found ${uniqueLinks.length} unique campaigns. Processing first ${limit}...`);

        console.log(`   🔍 Normalizing bank name...`);
        const bankName = await normalizeBankName('İş Bankası');
        console.log(`   ✅ Normalized bank: ${bankName}`);

        let count = 0;
        for (const url of uniqueLinks) {
            console.log(`   🔍 Processing [${count + 1}/${Math.min(uniqueLinks.length, limit)}]: ${url}`);
            if (count >= limit) break;

            try {
                await sleep(3000 + Math.random() * 2000); // Increased delay between campaigns (3-5s)

                // Improved retry logic for detail page
                let detailRetries = 0;
                let success = false;
                while (detailRetries < 5 && !success) {
                    try {
                        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                        success = true;
                    } catch (e: any) {
                        detailRetries++;
                        const backoff = 3000 * detailRetries;
                        console.error(`      ⚠️ Detail load attempt ${detailRetries}/5 for ${url}: ${e.message}. Retrying in ${backoff / 1000}s...`);
                        await sleep(backoff);
                        await page.setUserAgent(userAgents[detailRetries % userAgents.length]);
                    }
                }

                if (!success) {
                    console.error(`      ❌ Failed to load ${url} after 5 retries.`);
                    continue;
                }

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
                    if (src) {
                        const imageUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                        // Download and proxy image through Supabase
                        image = await downloadImageDirectly(imageUrl, title, 'maximum');
                    }
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

                // Lookup and assign IDs from master tables
                const ids = await lookupIDs(
                    campaignData.bank,
                    campaignData.card_name,
                    undefined, // brand will be determined by AI or generic detector in other scrapers, but here we use simple flow
                    campaignData.sector_slug
                );
                Object.assign(campaignData, ids);

                // DB Upsert
                console.log(`      💾 Upserting: ${title.substring(0, 30)}... [bank_id: ${(campaignData as any).bank_id}, card_id: ${(campaignData as any).card_id}]`);
                const { error } = await supabase
                    .from('campaigns')
                    .upsert(campaignData, { onConflict: 'reference_url' });

                if (error) {
                    console.error(`      ❌ DB Error for "${title}": ${error.message}`);
                } else {
                    console.log(`      ✅ Successfully saved/updated.`);
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
