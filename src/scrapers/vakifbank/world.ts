
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';
import { syncEarningAndDiscount } from '../../utils/dataFixer';
import { normalizeBankName, normalizeCardName } from '../../utils/bankMapper';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BASE_URL = 'https://www.vakifkart.com.tr';
const LIST_URL_TEMPLATE = 'https://www.vakifkart.com.tr/kampanyalar/sayfa/';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runVakifbankWorldScraper() {
    console.log('🚀 Starting VakıfBank Scraper...');
    const normalizedBank = await normalizeBankName('Vakıfbank');
    const normalizedCard = await normalizeCardName(normalizedBank, 'World');
    console.log(`   Bank: ${normalizedBank}, Card: ${normalizedCard}`);
    const isAIEnabled = process.argv.includes('--ai');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        const campaignLinks: string[] = [];
        const MAX_PAGES = 10; // Check first 10 pages

        // 1. Collect Links
        console.log('   📄 Collecting campaign links...');
        for (let i = 1; i <= MAX_PAGES; i++) {
            const url = `${LIST_URL_TEMPLATE}${i}`;
            process.stdout.write(`   Scanning Page ${i}... `);

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                const newLinks = await page.evaluate(() => {
                    const links: string[] = [];
                    // @ts-ignore
                    const elements = document.querySelectorAll('div.mainKampanyalarDesktop:not(.eczk) .list a.item');
                    elements.forEach((a: any) => {
                        const href = a.getAttribute('href');
                        if (href) links.push(href);
                    });
                    return links;
                });

                if (newLinks.length === 0) {
                    console.log('No more campaigns found.');
                    break;
                }

                newLinks.forEach(link => {
                    const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
                    if (!campaignLinks.includes(fullUrl)) {
                        campaignLinks.push(fullUrl);
                    }
                });
                console.log(`Found ${newLinks.length} new.`);

            } catch (err) {
                console.log('Error loading page.');
            }

            await sleep(1000);
        }


        // 2. Process Details
        for (const fullUrl of campaignLinks) {
            console.log(`\n   🔍 Processing: ${fullUrl}`);

            try {
                await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Wait for title or failure
                try {
                    await page.waitForSelector('.kampanyaDetay .title h1', { timeout: 5000 });
                } catch { }

                const html = await page.content();

                // Extract basic info for fallback
                const fallbackData = await page.evaluate((baseUrl) => {
                    // @ts-ignore
                    const titleEl = document.querySelector('.kampanyaDetay .title h1') || document.querySelector('h1');
                    // @ts-ignore
                    const title = titleEl ? titleEl.innerText.trim() : 'Başlıksız Kampanya';

                    let image = null;
                    // @ts-ignore
                    const imgEl = document.querySelector('.kampanyaDetay .coverSide img');
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
                    campaignData = await parseWithGemini(html, fullUrl, 'Vakıfbank', normalizedCard);
                } else {
                    campaignData = {
                        title: fallbackData.title,
                        description: fallbackData.title,
                        card_name: 'VakıfBank World',
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
                    campaignData.title = fallbackData.title; // Strict Assignment
                    campaignData.card_name = normalizedCard; // Match admin panel exactly
                    campaignData.bank = normalizedBank; // Dynamic mapping from bank_configs

                    // MAP FIELDS TO DB SCHEMA
                    campaignData.url = fullUrl;
                    campaignData.reference_url = fullUrl;
                    campaignData.image = fallbackData.image;
                    // campaignData.image_url = fallbackData.image;

                    if (!campaignData.image && fallbackData.image) {
                        campaignData.image = fallbackData.image;
                    }
                    campaignData.category = campaignData.category || 'Diğer';
                    campaignData.sector_slug = generateSectorSlug(campaignData.category);
                    syncEarningAndDiscount(campaignData);
                    campaignData.publish_status = 'processing';
                    campaignData.publish_updated_at = new Date().toISOString();
                    campaignData.is_active = true;

                    // Set default min_spend
                    campaignData.min_spend = campaignData.min_spend || 0;

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

runVakifbankWorldScraper();
