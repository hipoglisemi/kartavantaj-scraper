/// <reference lib="dom" />
import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security'
        ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1400, height: 900 });

    try {
        console.log('Navigating to Maximum Campaigns...');
        await page.goto('https://www.maximum.com.tr/kampanyalar', { waitUntil: 'domcontentloaded', timeout: 30000 });

        console.log('Waiting for content...');
        await new Promise(r => setTimeout(r, 5000));

        const cardHtml = await page.evaluate(() => {
            const results: any[] = [];
            document.querySelectorAll('.card').forEach((card: any) => {
                const titleEl = card.querySelector('.card-text, h3, .card-title, h5, h4, .title');
                const raw = titleEl ? titleEl.innerText.trim() : 'NULL';
                const fallback = card.innerText.split('\n')[0];
                results.push({
                    found: raw,
                    fallback: fallback,
                    fullText: card.innerText.substring(0, 50)
                });
            });
            return results;
        });

        console.log('--- EXTRACTION TEST ---');
        console.log(JSON.stringify(cardHtml, null, 2));
        console.log('--- END TEST ---');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
