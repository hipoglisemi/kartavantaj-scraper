
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BASE_URL = 'https://www.paraf.com.tr';
const CAMPAIGNS_URL = 'https://www.paraf.com.tr/tr/kampanyalar.html';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runParafScraper() {
    console.log('🚀 Starting Halkbank (Paraf) Scraper...');
    const isAIEnabled = process.argv.includes('--ai');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set viewport for better loading
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log(`\n   🔍 Navigating to ${CAMPAIGNS_URL}...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Handle "Daha Fazla" (Load More) button logic
        let hasMore = true;
        let buttonClickCount = 0;
        const MAX_CLICKS = 30; // Paraf uses many clicks

        console.log('   🔄 Loading all campaigns (clicking "Daha Fazla Göster")...');

        while (hasMore && buttonClickCount < MAX_CLICKS) {
            try {
                // Selector based on Python script: ".button--more-campaign a"
                const buttonFound = await page.evaluate(() => {
                    // @ts-ignore
                    const btn = document.querySelector('.button--more-campaign a');
                    if (btn && btn.offsetParent !== null) { // Check visibility
                        (btn as any).click();
                        return true;
                    }
                    return false;
                });

                if (buttonFound) {
                    await sleep(3000); // Paraf is slow, wait more
                    buttonClickCount++;
                    process.stdout.write('.');
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
            const elements = document.querySelectorAll('.cmp-list--campaigns .cmp-teaser__title a');
            elements.forEach((a: any) => {
                const href = a.getAttribute('href');
                if (href && href.includes('/kampanyalar/')) {
                    links.push(href);
                }
            });
            return [...new Set(links)];
        });

        console.log(`   🎉 Found ${campaignLinks.length} campaigns. Processing details...`);

        // Process Each Campaign
        for (const link of campaignLinks) {
            const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;

            console.log(`\n   🔍 Processing: ${fullUrl}`);

            try {
                await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Wait for title
                try {
                    await page.waitForSelector('.master-banner__content h1', { timeout: 5000 });
                } catch { }

                const html = await page.content();

                // Extract basic info for fallback
                const fallbackData = await page.evaluate((baseUrl) => {
                    // @ts-ignore
                    const titleEl = document.querySelector('.master-banner__content h1') || document.querySelector('h1');
                    // @ts-ignore
                    const title = titleEl ? titleEl.innerText.trim() : 'Başlıksız Kampanya';

                    let image = null;
                    // @ts-ignore
                    const imgDiv = document.querySelector('.master-banner__image');
                    if (imgDiv) {
                        const style = imgDiv.getAttribute('style');
                        if (style) {
                            const match = style.match(/url\(['"]?(.*?)['"]?\)/);
                            if (match) image = match[1];
                        }
                    }

                    if (image && !image.startsWith('http')) {
                        image = baseUrl + image;
                    }

                    return { title, image };
                }, BASE_URL);

                // AI Parsing
                let campaignData;
                if (isAIEnabled) {
                    campaignData = await parseWithGemini(html, fullUrl);
                } else {
                    campaignData = {
                        title: fallbackData.title,
                        description: fallbackData.title,
                        card_name: 'Paraf',
                        url: fullUrl,
                        reference_url: fullUrl,
                        image: fallbackData.image || '',
                        category: 'Diğer',
                        sector_slug: 'diger',
                        is_active: true
                    };
                }

                if (campaignData) {
                    // Force fields
                    campaignData.card_name = 'Paraf';
                    campaignData.bank = 'Halkbank'; // Enforce strict bank assignment

                    // MAP FIELDS TO DB SCHEMA
                    campaignData.url = fullUrl;
                    campaignData.reference_url = fullUrl;
                    campaignData.image = fallbackData.image;
                    // campaignData.image_url = fallbackData.image;

                    if (!campaignData.image && fallbackData.image) {
                        campaignData.image = fallbackData.image;
                    }
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

                    const { error } = await supabase
                        .from('campaigns')
                        .upsert(campaignData, { onConflict: 'reference_url' });

                    if (error) {
                        console.error(`      ❌ Supabase Error: ${error.message}`);
                    } else {
                        console.log(`      ✅ Saved to DB: ${fallbackData.title}`);
                    }
                }

            } catch (err: any) {
                console.error(`      ❌ Error processing detail ${fullUrl}: ${err.message}`);
            }

            await sleep(1000);
        }

    } catch (error: any) {
        console.error(`❌ Global Error: ${error.message}`);
    } finally {
        await browser.close();
    }
}

runParafScraper();
