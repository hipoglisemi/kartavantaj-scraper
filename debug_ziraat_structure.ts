import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function debugZiraat() {
    const url = 'https://www.bankkart.com.tr/kampanyalar/diger-kampanyalar/troy-logolu-kredi-kartiniza-secili-sektorlerde-3000-tl-bankkart-lira';
    console.log(`Navigating to ${url}...`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set UA to standard desktop
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait a bit for any dynamic content
        await new Promise(r => setTimeout(r, 3000));

        const html = await page.content();
        console.log('--- PAGE CONTENT LENGTH ---');
        console.log(html.length);

        // Save to file for grep
        fs.writeFileSync('ziraat_dump.html', html);
        console.log('Saved to ziraat_dump.html');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

debugZiraat();
