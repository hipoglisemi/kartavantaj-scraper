import puppeteer from 'puppeteer';
import * as fs from 'fs';

(async () => {
    const url = 'https://www.paraf.com.tr/content/parafcard/tr/kampanyalar/e-ticaret/secili-eticaret-alisverislerinize-10000tlye-varan-parafpara1.html';
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Bot evasion
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('Navigating...');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Wait for some common selectors
    try { await page.waitForSelector('.cmp-text', { timeout: 5000 }); } catch (e) {}

    const html = await page.content();
    fs.writeFileSync('paraf_debug.html', html);
    console.log('Saved paraf_debug.html');

    // Quick text check
    const text = await page.evaluate(() => document.body.innerText);
    console.log('Body text length:', text.length);
    console.log('Contains "TL harcama"?:', text.includes('TL harcama'));

    await browser.close();
})();
