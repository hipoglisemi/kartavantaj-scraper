import puppeteer from 'puppeteer';
import { scrapeCampaignDetail } from './src/scrapers/ziraat/bankkart';
import { parseWithGemini } from './src/services/geminiParser';
import * as dotenv from 'dotenv';
dotenv.config();

const URLS = [
    'https://www.bankkart.com.tr/kampanyalar/diger-kampanyalar/troy-logolu-kredi-kartiniza-secili-sektorlerde-3000-tl-bankkart-lira',
    'https://www.bankkart.com.tr/kampanyalar/market-ve-gida/kocatepe-kahve-evinde-400-tl-bankkart-lira'
];

async function verifyFix() {
    console.log('Testing updated Ziraat scraper...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        for (const url of URLS) {
            console.log(`\nURL: ${url}`);
            const content = await scrapeCampaignDetail(page, url);
            console.log(`Title Found: ${content.title}`);
            console.log(`HTML Length: ${content.html.length}`);

            // Analyze HTML snippet for keywords
            const text = content.html;
            const hasDetails = text.includes('Kampanya Koşulları') || text.length > 2000;
            const hasAccordion = text.includes('accordion');

            console.log(`Seems valid? ${hasDetails ? 'YES' : 'NO'}`);
            console.log(`Snippets: ${text.substring(0, 300)}...`);

            // Dry run AI parsing
            if (process.env.GOOGLE_GEMINI_KEY) {
                console.log('Running Gemini parse...');
                const metadata = { title: content.title, bank: 'Ziraat', card: 'Bankkart', image: content.image };
                const result = await parseWithGemini(content.html, url, 'Ziraat', 'Bankkart', metadata);
                console.log('GEMINI RESULT:');
                console.log(`  Description Len: ${result.description?.length}`);
                console.log(`  Conditions: ${result.conditions?.length}`);
                console.log(`  Steps: ${result.participation_points?.length}`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

verifyFix();
