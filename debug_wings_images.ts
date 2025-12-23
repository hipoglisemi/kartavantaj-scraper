import puppeteer from 'puppeteer';

async function debugWingsImages() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Test URL
    const testUrl = 'https://www.wingscard.com.tr/kampanyalar/wings-ile-chip-paralariniz-bagis-odemelerinde-5-kat-degerleniyor-tog';

    console.log('Navigating to:', testUrl);
    await page.goto(testUrl, { waitUntil: 'networkidle2' });

    // Try different selectors
    const imageData = await page.evaluate(() => {
        const results: any = {};

        // Try all possible image selectors
        const selectors = [
            '.banner-image img',
            'img.campaign-detail-image',
            '.campaign-banner img',
            '.detail-banner img',
            'img[src*="campaign"]',
            'img[src*="kampanya"]',
            '.hero-image img',
            'picture img',
            '.main-image img'
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

        results.allImages = allImages.slice(0, 10); // First 10 images

        return results;
    });

    console.log('Image data:', JSON.stringify(imageData, null, 2));

    await browser.close();
}

debugWingsImages().catch(console.error);
