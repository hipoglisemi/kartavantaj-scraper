import puppeteer from 'puppeteer';
import { cleanCampaignText } from './src/utils/textCleaner';

async function test() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.wingscard.com.tr/kampanyalar/onur-market-magazalarinda-100-tl-chip-para', { waitUntil: 'networkidle2' });
    const html = await page.content();
    
    // Check for "Onur Market" and "31 Ocak" in raw HTML
    console.log('Raw HTML contains Onur Market:', html.includes('Onur Market'));
    console.log('Raw HTML contains 31 Ocak:', html.includes('31 Ocak'));
    
    // Now simulate the parser cleaning
    let decoded = html
        .replace(/&q;/g, '"')
        .replace(/&l;/g, '<')
        .replace(/&g;/g, '>')
        .replace(/&ndash;/g, '-')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
        
    const text = cleanCampaignText(decoded).substring(0, 30000);
    console.log('Cleaned text length:', text.length);
    console.log('Cleaned text contains Onur Market:', text.includes('Onur Market'));
    console.log('Cleaned text contains 31 Ocak:', text.includes('31 Ocak'));
    
    await browser.close();
}

test();
