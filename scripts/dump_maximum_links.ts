import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

async function findMaximumLinks() {
    console.log('🚀 Checking Maximum links...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('📄 Loading https://www.maximum.com.tr/kampanyalar...');
        await page.goto('https://www.maximum.com.tr/kampanyalar', { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait and scroll
        console.log('🖱️ Scrolling...');
        await page.evaluate(() => window.scrollBy(0, 1000));
        await new Promise(r => setTimeout(r, 3000));

        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .map(a => ({
                    href: a.href,
                    text: a.innerText.trim()
                }))
                .filter(item => item.href.includes('/kampanyalar/') && !item.href.includes('arsiv'));
        });

        console.log(`\n✅ Found ${links.length} total links in /kampanyalar/`);

        const uniqueLinks = Array.from(new Set(links.map(l => JSON.stringify(l)))).map(s => JSON.parse(s));

        console.log('\nSample Links:');
        uniqueLinks.slice(0, 50).forEach((link, i) => {
            console.log(`${i + 1}. [${link.text}] ${link.href}`);
        });

    } catch (e: any) {
        console.error('❌ Error:', e.message);
    } finally {
        await browser.close();
    }
}
findMaximumLinks();
