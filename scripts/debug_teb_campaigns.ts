import 'dotenv/config';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.teb.com.tr';
const CAMPAIGNS_URL = 'https://www.teb.com.tr/sizin-icin/kampanyalar/';

async function debugTebCampaigns() {
    console.log('🔍 Debugging TEB Campaign Extraction...\n');

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

        // Wait for cards
        await page.waitForSelector('.kContBox', { timeout: 10000 }).catch(() => {
            console.log('⚠️  .kContBox not found, checking page structure...');
        });

        // Take a screenshot
        await page.screenshot({ path: 'teb_campaigns_page.png', fullPage: true });
        console.log('📸 Screenshot saved: teb_campaigns_page.png\n');

        const content = await page.content();
        const $ = cheerio.load(content);

        // Debug: Check different selectors
        console.log('=== Selector Analysis ===');
        console.log(`Total .kContBox elements: ${$('.kContBox').length}`);
        console.log(`Total .kContBox a elements: ${$('.kContBox a').length}`);
        console.log(`Total links on page: ${$('a').length}\n`);

        // Extract all links from .kContBox
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

        console.log('=== Extracted Campaign Links ===');
        console.log(`Total unique links found: ${allLinks.length}\n`);

        allLinks.forEach((link, idx) => {
            console.log(`[${idx + 1}] ${link}`);
        });

        // Check if there are pagination or "load more" buttons
        console.log('\n=== Pagination Check ===');
        const paginationSelectors = [
            '.pagination',
            '.pager',
            '.load-more',
            '.btn-load-more',
            'button[data-load]',
            'a[data-page]'
        ];

        paginationSelectors.forEach(selector => {
            const found = $(selector).length;
            if (found > 0) {
                console.log(`✅ Found ${found} elements with selector: ${selector}`);
            }
        });

        // Check for any JavaScript-based loading
        console.log('\n=== JavaScript Analysis ===');
        const scripts = $('script').length;
        console.log(`Total script tags: ${scripts}`);

        // Check if campaigns are loaded dynamically
        console.log('\n=== Dynamic Content Check ===');
        await page.waitForTimeout(3000);
        const contentAfterWait = await page.content();
        const $after = cheerio.load(contentAfterWait);
        const linksAfterWait = $after('.kContBox a').length;
        console.log(`Links after 3s wait: ${linksAfterWait}`);

        // Scroll to bottom to trigger lazy loading
        console.log('\n=== Scroll Test ===');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);

        const contentAfterScroll = await page.content();
        const $scroll = cheerio.load(contentAfterScroll);
        const linksAfterScroll = $scroll('.kContBox a').length;
        console.log(`Links after scroll: ${linksAfterScroll}`);

        console.log('\n✅ Debug complete. Check the screenshot for visual verification.');

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

debugTebCampaigns();
