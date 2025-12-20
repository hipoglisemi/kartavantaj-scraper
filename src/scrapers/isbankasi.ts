
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../services/geminiParser';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BASE_URL = 'https://www.maximum.com.tr';
const CAMPAIGNS_URL = 'https://www.maximum.com.tr/kampanyalar';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runIsBankasiScraper() {
    console.log('🚀 Starting İş Bankası (Maximum) Scraper...');
    const isAIEnabled = process.argv.includes('--ai');

    const browser = await puppeteer.launch({
        headless: true, // Use boolean true for new headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log(`\n   🔍 Navigating to ${CAMPAIGNS_URL}...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

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
                await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

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
                        reference_url: fullUrl,
                        image_url: fullImageUrl,
                        is_active: true
                    };
                }

                if (campaignData) {
                    // Force fields
                    campaignData.card_name = 'Maximum';
                    campaignData.reference_url = fullUrl;
                    if (!campaignData.image_url && fullImageUrl) {
                        campaignData.image_url = fullImageUrl;
                    }
                    campaignData.is_active = true;

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

runIsBankasiScraper();
