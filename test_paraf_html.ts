import puppeteer from 'puppeteer';

async function test() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('https://www.paraf.com.tr/content/parafcard/tr/kampanyalar/giyim-kozmetik-ve-aksesuar/kozmetik-alisverislerinize-500tl-parafpara.html', {
        waitUntil: 'networkidle2',
        timeout: 20000
    });
    
    const html = await page.content();
    
    // Check if date is in HTML
    const hasDate = html.includes('Ocak 2026') || html.includes('ocak 2026');
    console.log('Date in HTML:', hasDate);
    
    // Extract the relevant part
    const match = html.match(/1-31 Ocak 2026[^<]*/i);
    console.log('Date text:', match ? match[0] : 'NOT FOUND');
    
    // Check HTML length
    console.log('HTML length:', html.length, 'chars');
    
    await browser.close();
}

test();
