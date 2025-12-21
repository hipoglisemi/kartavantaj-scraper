
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BASE_URL = 'https://www.maximum.com.tr';
const CAMPAIGNS_URL = 'https://www.maximum.com.tr/kampanyalar';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runScraperLogic(isAIEnabled: boolean) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });
    const page = await browser.newPage();

    // Set realistic User-Agent
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set extra headers
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    });

    try {
        console.log(`\n   🔍 Navigating to ${CAMPAIGNS_URL}...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        // Handle "Daha Fazla" (Load More) button logic
        let hasMore = true;
        let buttonClickCount = 0;
        const MAX_CLICKS = 20; // Safety limit

        console.log('   🔄 Loading all campaigns (clicking "Daha Fazla")...');

        while (hasMore && buttonClickCount < MAX_CLICKS) {
            try {
                const buttonFound = await page.evaluate(() => {
                    // @ts-ignore
                    const buttons = Array.from(document.querySelectorAll('button'));
                    // @ts-ignore
                    const btn = buttons.find((b: any) => b.innerText.includes('Daha Fazla'));
                    if (btn) {
                        (btn as any).click();
                        return true;
                    }
                    return false;
                });

                if (buttonFound) {
                    await sleep(2000); // Wait for content to load
                    buttonClickCount++;
                    process.stdout.write('.'); // Progress indicator
                } else {
                    hasMore = false;
                }
            } catch (e) {
                console.log('   ℹ️ No more buttons found or error clicking.');
                hasMore = false;
            }
        }
        console.log(`\n   ✅ Loaded full list after ${buttonClickCount} clicks.`);

        // Extract Links
        const campaignLinks = await page.evaluate(() => {
            const links: string[] = [];
            // @ts-ignore
            document.querySelectorAll('a').forEach((a: any) => {
                const href = a.getAttribute('href');
                if (href && href.includes('/kampanyalar/') && !href.includes('arsiv') && href.length > 25) {
                    links.push(href);
                }
            });
            return [...new Set(links)]; // Unique links
        });

        console.log(`   🎉 Found ${campaignLinks.length} campaigns. Processing details...`);

        // Process Each Campaign
        for (const link of campaignLinks) {
            const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;

            console.log(`\n   🔍 Processing: ${fullUrl}`);

            try {
                await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

                // Get page content
                // Maximum site loads details dynamically too? Python script implies it.
                // It waits for "span[id$='CampaignDescription']"

                try {
                    await page.waitForSelector("span[id$='CampaignDescription']", { timeout: 5000 });
                } catch {
                    // Ignore, might be simple text page
                }

                const html = await page.content();

                const title = await page.evaluate(() => {
                    // @ts-ignore
                    const h1 = document.querySelector('h1.gradient-title-text') || document.querySelector('h1');
                    return h1 ? (h1 as any).innerText.trim() : 'Başlıksız Kampanya';
                });

                const imageUrl = await page.evaluate(() => {
                    // @ts-ignore
                    const img = document.querySelector("img[id$='CampaignImage']");
                    return img ? img.getAttribute('src') : null;
                });

                const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`) : '';

                // AI Parsing
                let campaignData;
                if (isAIEnabled) {
                    campaignData = await parseWithGemini(html, fullUrl);
                } else {
                    campaignData = {
                        title: title,
                        description: title,
                        card_name: 'Maximum',
                        url: fullUrl,
                        reference_url: fullUrl,
                        image: fullImageUrl,
                        category: 'Diğer',
                        sector_slug: 'diger',
                        is_active: true
                    };
                }

                if (campaignData) {
                    // Force fields
                    campaignData.card_name = 'Maximum';
                    campaignData.bank = 'İş Bankası'; // Enforce strict bank assignment

                    // MAP FIELDS TO DB SCHEMA
                    campaignData.url = fullUrl;
                    campaignData.reference_url = fullUrl;
                    campaignData.image = fullImageUrl;
                    // campaignData.image_url = fullImageUrl;

                    if (!campaignData.image && fullImageUrl) {
                        campaignData.image = fullImageUrl;
                    }
                    campaignData.category = campaignData.category || 'Diğer';
                    campaignData.sector_slug = generateSectorSlug(campaignData.category);
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
                const errorMsg = err.message || String(err);

                // Specific handling for connection errors
                if (errorMsg.includes('ERR_CONNECTION_RESET') ||
                    errorMsg.includes('ERR_CONNECTION_REFUSED') ||
                    errorMsg.includes('net::')) {
                    console.error(`      ⚠️ Network error: ${errorMsg}`);
                    console.error(`      💡 This might be temporary. Will retry on next run.`);
                } else if (errorMsg.includes('timeout')) {
                    console.error(`      ⏱️ Timeout error: ${errorMsg}`);
                } else {
                    console.error(`      ❌ Error processing ${fullUrl}: ${errorMsg}`);
                }
            }

            await sleep(1000);
        }

    } catch (error: any) {
        console.error(`❌ Global Error: ${error.message}`);
        throw error;
    } finally {
        await browser.close();
    }
}

async function runMaximumScraper() {
    console.log('🚀 Starting İş Bankası (Maximum) Scraper...');
    const isAIEnabled = process.argv.includes('--ai');

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000; // 5 seconds

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`\n   🔄 Attempt ${attempt}/${MAX_RETRIES}...`);
            await runScraperLogic(isAIEnabled);
            console.log('\n✅ İş Bankası scraper completed successfully!');
            return; // Success, exit
        } catch (error: any) {
            const errorMsg = error.message || String(error);
            console.error(`\n   ❌ Attempt ${attempt} failed: ${errorMsg}`);

            if (attempt < MAX_RETRIES) {
                console.log(`   ⏳ Retrying in ${RETRY_DELAY / 1000}s...`);
                await sleep(RETRY_DELAY);
            } else {
                console.error(`\n   ❌ All ${MAX_RETRIES} attempts failed.`);
                console.error(`   💡 Possible causes: Site blocking, network issues, or temporary downtime.`);
                throw error;
            }
        }
    }
}

runMaximumScraper();
