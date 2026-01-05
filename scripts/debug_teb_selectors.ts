
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.teb.com.tr';
const CAMPAIGNS_URL = 'https://www.teb.com.tr/sizin-icin/kampanyalar/';

async function debugTeb() {
    console.log('🚀 Debugging TEB Scraper...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log(`🔍 Loading List...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.kContBox');

        const content = await page.content();
        const $ = cheerio.load(content);
        let allLinks: string[] = [];
        $('.kContBox a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && !href.includes('javascript:') && href.length > 10) {
                let fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
                if (!allLinks.includes(fullUrl)) allLinks.push(fullUrl);
            }
        });

        console.log(`🎉 Found ${allLinks.length} total links.`);

        // Take a few links and test detail page
        const testLinks = allLinks.slice(0, 10);
        for (const url of testLinks) {
            console.log(`\n📄 Testing: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Timeout'));

            // Wait for splash screen to disappear
            await page.waitForFunction('() => {\n                const splash = document.querySelector(".blockUI");\n                if (!splash) return true;\n                const style = window.getComputedStyle(splash);\n                return style.display === "none" || style.visibility === "hidden" || style.opacity === "0";\n            }', { timeout: 10000 }).catch(() => console.log('   ⚠️ Splash stuck'));

            const detailContent = await page.content();
            const $d = cheerio.load(detailContent);

            const title = $d('.heading h1').first().text().trim() || $d('h1').first().text().trim() || "Başlık Yok";
            const image = $d('.detailImgHolder img').first().attr('src');
            const hasContent = $d('.detayTabContent').text().trim().length > 10 || $d('.subPageContent').text().trim().length > 10;

            console.log(`   Title: "${title}"`);
            console.log(`   Image: ${image ? '✅' : '❌'}`);
            console.log(`   Content: ${hasContent ? '✅' : '❌'}`);

            if (title.includes('İşleminiz Devam Ediyor')) {
                console.log('   🚨 FAILED: Stuck on splash screen');
            }
        }
    } finally {
        await browser.close();
    }
}

debugTeb();
