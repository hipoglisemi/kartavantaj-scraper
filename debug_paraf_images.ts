import puppeteer from 'puppeteer';

async function debugParafImages() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Test URL
    const testUrl = 'https://www.paraf.com.tr/content/parafcard/tr/kampanyalar/e-ticaret/secili-eticaret-alisverislerinize-10000tlye-varan-parafpara1.html';

    console.log('Navigating to:', testUrl);
    await page.goto(testUrl, { waitUntil: 'networkidle2' });

    // Try different selectors
    const imageData = await page.evaluate(() => {
        const results: any = {};

        // Try all possible image selectors
        const selectors = [
            '.cmp-image__image',
            '.cmp-teaser__image img',
            'img[src*="teaser.coreimg"]',
            '.master-banner__image',
            '.cmp-image img',
            'img[src*="/kampanyalar/"]',
            'img[src*="campaign"]',
            'picture img',
            '.campaign-image img'
        ];

        selectors.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) {
                results[selector] = {
                    src: el.getAttribute('src'),
                    srcset: el.getAttribute('srcset'),
                    tag: el.tagName
                };
            }
        });

        // Also check all images on page
        const allImages = Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt,
            class: img.className
        }));

        results.allImages = allImages;

        // Check background images
        const divs = Array.from(document.querySelectorAll('div[style*="background"]'));
        results.backgroundImages = divs.map(div => ({
            style: (div as HTMLElement).style.backgroundImage,
            class: div.className
        })).filter(d => d.style);

        return results;
    });

    console.log('Image data:', JSON.stringify(imageData, null, 2));

    await browser.close();
}

debugParafImages().catch(console.error);
