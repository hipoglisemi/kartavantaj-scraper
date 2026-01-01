import puppeteer from 'puppeteer';

async function test() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.wingscard.com.tr/kampanyalar/onur-market-magazalarinda-100-tl-chip-para', { waitUntil: 'networkidle2' });
    const html = await page.content();
    
    const lines = html.split('\n');
    const dateLine = lines.find(line => line.includes('31 Ocak'));
    if (dateLine) {
        console.log('Found line with date:', dateLine.substring(0, 500));
        const junkPatterns = [/akbank t\.a\.ş\./gi, /yasal mevzuat/gi];
        const isJunk = junkPatterns.some(p => p.test(dateLine));
        console.log('Is this line considered junk?', isJunk);
    } else {
        console.log('Date line not found after split! Check for other delimiters.');
        // Maybe it's not split by \n
        console.log('First 2000 chars of HTML:', html.substring(0, 2000));
    }
    
    await browser.close();
}

test();
