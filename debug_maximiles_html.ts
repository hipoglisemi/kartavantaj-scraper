import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';

puppeteer.use(StealthPlugin());

async function dumpHtml() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Maximiles campaign page
    const url = 'https://www.maximiles.com.tr/kampanyalar/egitim-odemelerinize-ozel-firsatlar-sizi-bekliyor';

    await page.goto(url, { waitUntil: 'networkidle2' });

    const html = await page.content();
    fs.writeFileSync('maximiles_debug.html', html);

    console.log('HTML dumped to maximiles_debug.html');
    await browser.close();
}

dumpHtml();
