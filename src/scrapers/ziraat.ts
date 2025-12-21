
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../services/geminiParser';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BASE_URL = 'https://www.bankkart.com.tr';
const CAMPAIGNS_URL = 'https://www.bankkart.com.tr/kampanyalar';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runZiraatScraper() {
    console.log('🚀 Starting Ziraat Bankkart Scraper...');
    const isAIEnabled = process.argv.includes('--ai');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set explicit viewport
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log(`\n   🔍 Navigating to ${CAMPAIGNS_URL}...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Infinite Scroll Logic
        console.log('   📜 Scrolling to load all campaigns...');

        let lastHeight = await page.evaluate('document.body.scrollHeight');
        let attempts = 0;

        while (true) {
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await sleep(2000);

            let newHeight = await page.evaluate('document.body.scrollHeight');

            // Try to find if there are new items or if we hit bottom
            if (newHeight === lastHeight) {
                attempts++;
                if (attempts >= 3) break; // Stop if height doesn't change after 3 tries
            } else {
                attempts = 0;
                lastHeight = newHeight;
                process.stdout.write('.');
            }
        }
        console.log('\n   ✅ Scroll completed.');

        // Extract Links
        const campaignLinks = await page.evaluate(() => {
            const links: string[] = [];
            // @ts-ignore
            const elements = document.querySelectorAll('a.campaign-box');
            elements.forEach((a: any) => {
                const href = a.getAttribute('href');
                if (href && href.includes('/kampanyalar/')) {
                    links.push(href);
                }
            });
            return [...new Set(links)];
        });

        console.log(`\n   🎉 Found ${campaignLinks.length} campaigns. Processing details...`);

        // Process Details
        for (const link of campaignLinks) {
            const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
            console.log(`\n   🔍 Processing: ${fullUrl}`);

            try {
                await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Wait for title
                try {
                    await page.waitForSelector('h1', { timeout: 5000 });
                } catch { }

                const html = await page.content();

                // Extract basic info for fallback
                const fallbackData = await page.evaluate((baseUrl) => {
                    // @ts-ignore
                    const titleEl = document.querySelector('h1') || document.querySelector('.page-title');
                    // @ts-ignore
                    const title = titleEl ? titleEl.innerText.trim() : 'Başlıksız Kampanya';

                    let image = null;
                    // @ts-ignore
                    const imgEl = document.querySelector('#firstImg') || document.querySelector('.subpage-detail figure img');
                    if (imgEl) {
                        image = imgEl.getAttribute('src');
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
                        card_name: 'Bankkart',
                        url: fullUrl,
                        reference_url: fullUrl,
                        image: fallbackData.image || '',
                        is_active: true
                    };
                }

                if (campaignData) {
                    // Force fields
                    campaignData.card_name = 'Bankkart';
                    campaignData.bank = 'Ziraat Bankası'; // Enforce strict bank assignment

                    // MAP FIELDS TO DB SCHEMA
                    campaignData.url = fullUrl;
                    campaignData.reference_url = fullUrl;
                    campaignData.image = fallbackData.image;
                    // campaignData.image_url = fallbackData.image;

                    if (!campaignData.image && fallbackData.image) {
                        campaignData.image = fallbackData.image;
                    }
                    campaignData.is_active = true;

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

runZiraatScraper();
