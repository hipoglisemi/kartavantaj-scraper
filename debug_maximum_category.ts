import * as fs from 'fs';
import puppeteer from 'puppeteer';

async function debugCategory() {
    // A known category page
    const url = 'https://www.maximum.com.tr/kampanyalar/market-kampanyalari';
    console.log(`Navigating to category: ${url}...`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 4000));

        const html = await page.content();
        console.log('--- PAGE CONTENT LENGTH ---');
        console.log(html.length);

        // Save for grep analysis
        fs.writeFileSync('maximum_category_dump.html', html);
        console.log('Saved to maximum_category_dump.html');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

debugCategory();
