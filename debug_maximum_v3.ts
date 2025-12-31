import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function debugMaximumPage() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.maximum.com.tr/kampanyalar', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));

    const analysis = await page.evaluate(() => {
        // Find all links
        const allLinks = Array.from(document.querySelectorAll('a'));
        const campaignLinks = allLinks.filter(a => {
            const href = a.getAttribute('href');
            return href && href.includes('/kampanyalar/') && !href.includes('arsiv');
        });

        console.log(`Total links: ${allLinks.length}`);
        console.log(`Campaign links: ${campaignLinks.length}`);

        // Sample first campaign card structure
        if (campaignLinks.length > 0) {
            const first = campaignLinks[0];
            return {
                totalLinks: allLinks.length,
                campaignLinks: campaignLinks.length,
                sampleHref: first.getAttribute('href'),
                sampleHTML: first.outerHTML.substring(0, 500),
                hasImage: !!first.querySelector('img'),
                imageInfo: first.querySelector('img') ? {
                    src: first.querySelector('img')?.src,
                    dataSrc: first.querySelector('img')?.getAttribute('data-src'),
                    alt: first.querySelector('img')?.alt
                } : null,
                titleSelectors: {
                    cardTitle: first.querySelector('.card-title')?.textContent?.trim(),
                    h5: first.querySelector('h5')?.textContent?.trim(),
                    h4: first.querySelector('h4')?.textContent?.trim(),
                    title: first.querySelector('.title')?.textContent?.trim()
                }
            };
        }

        return { totalLinks: allLinks.length, campaignLinks: 0 };
    });

    console.log('📊 Page Analysis:', JSON.stringify(analysis, null, 2));

    await browser.close();
}

debugMaximumPage();
