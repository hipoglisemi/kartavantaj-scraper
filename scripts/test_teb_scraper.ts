import 'dotenv/config';
import { supabase } from '../src/utils/supabase';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.teb.com.tr';
const CAMPAIGNS_URL = 'https://www.teb.com.tr/sizin-icin/kampanyalar/';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testTebScraper() {
    console.log('🧪 Testing TEB Scraper with detailed logging...\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        console.log(`Loading: ${CAMPAIGNS_URL}...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        await page.waitForSelector('.kContBox', { timeout: 10000 });

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
        console.log(`✅ Found ${uniqueLinks.length} unique campaigns.\n`);

        // Test first 5 campaigns
        let successCount = 0;
        let failCount = 0;
        const failures: { url: string; reason: string }[] = [];

        for (let i = 0; i < Math.min(5, uniqueLinks.length); i++) {
            const url = uniqueLinks[i];
            console.log(`\n[${i + 1}/${uniqueLinks.length}] Testing: ${url}`);

            try {
                await sleep(2000);
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

                // Wait for splash screen
                await page.waitForFunction(() => {
                    const splash = document.querySelector('.blockUI');
                    if (!splash) return true;
                    const style = window.getComputedStyle(splash);
                    return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
                }, { timeout: 15000 }).catch(() => console.log('   ⚠️  Splash timeout'));

                const detailContent = await page.content();
                const $d = cheerio.load(detailContent);

                let title = $d('.heading h1').first().text().trim() || $d('h1').first().text().trim() || "Başlık Yok";

                // Retry if splash screen text
                if (title.includes('İşleminiz Devam Ediyor')) {
                    await sleep(2000);
                    const retryContent = await page.content();
                    const $dr = cheerio.load(retryContent);
                    title = $dr('.heading h1').first().text().trim() || $dr('h1').first().text().trim();
                }

                // Check if valid
                if (title.length < 5 || title.includes('İşleminiz Devam Ediyor')) {
                    console.log(`   ❌ FAIL: Invalid title: "${title}"`);
                    failures.push({ url, reason: `Invalid title: "${title}"` });
                    failCount++;
                    continue;
                }

                // Image check
                let image = "";
                const imgEl = $d('.detailImgHolder img').first();
                if (imgEl.length > 0) {
                    const src = imgEl.attr('src');
                    if (src) {
                        image = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                    }
                }

                console.log(`   ✅ SUCCESS: "${title.substring(0, 50)}..." (Image: ${image ? '✅' : '❌'})`);
                successCount++;

            } catch (error: any) {
                console.log(`   ❌ FAIL: ${error.message}`);
                failures.push({ url, reason: error.message });
                failCount++;
            }
        }

        console.log(`\n\n=== SUMMARY ===`);
        console.log(`Total tested: ${Math.min(5, uniqueLinks.length)}`);
        console.log(`Success: ${successCount}`);
        console.log(`Failed: ${failCount}`);

        if (failures.length > 0) {
            console.log(`\n=== FAILURES ===`);
            failures.forEach((f, i) => {
                console.log(`[${i + 1}] ${f.url}`);
                console.log(`    Reason: ${f.reason}`);
            });
        }

    } catch (error: any) {
        console.error('❌ Critical Error:', error.message);
    } finally {
        await browser.close();
    }
}

testTebScraper();
