import puppeteer from 'puppeteer-extra';
import * as dotenv from 'dotenv';

dotenv.config();

const CAMPAIGNS_URL = 'https://www.chippin.com/kampanyalar';

async function debugChippinImages() {
    console.log('🔍 Debugging Chippin Image Loading...\n');

    const browser = await puppeteer.launch({
        headless: false, // Visual debug
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`📄 Navigating to ${CAMPAIGNS_URL}...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 6000));

        // Extract campaign data
        const rawData = await page.evaluate(() => {
            const script = document.getElementById('__NEXT_DATA__');
            return script ? script.innerHTML : null;
        });

        if (!rawData) {
            throw new Error('__NEXT_DATA__ not found');
        }

        const nextData = JSON.parse(rawData);
        const campaigns = nextData?.props?.pageProps?.campaigns || [];

        console.log(`Found ${campaigns.length} campaigns\n`);

        // Test first 3 campaigns
        for (let i = 0; i < Math.min(3, campaigns.length); i++) {
            const campaign = campaigns[i];
            const imageUrl = campaign.webBanner.startsWith('http')
                ? campaign.webBanner
                : `https://www.chippin.com${campaign.webBanner}`;

            console.log(`\n--- Campaign ${i + 1}: ${campaign.webName} ---`);
            console.log(`Image URL: ${imageUrl}`);

            const filename = imageUrl.split('/').pop()?.split('?')[0];
            console.log(`Filename: ${filename}`);

            // Test different selectors
            const selectors = [
                `img[src*="${filename}"]`,
                `img[src="${imageUrl}"]`,
                `img[alt*="${campaign.webName.substring(0, 20)}"]`,
                'img[class*="banner"]',
                'img[class*="campaign"]'
            ];

            for (const selector of selectors) {
                const found = await page.$(selector);
                console.log(`  ${selector}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
            }

            // Check all images on page
            const allImages = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.src,
                    alt: img.alt,
                    className: img.className
                }));
            });

            console.log(`\nTotal images on page: ${allImages.length}`);
            const matchingImages = allImages.filter(img =>
                img.src.includes(filename || '') ||
                img.src === imageUrl
            );

            if (matchingImages.length > 0) {
                console.log('✅ Found matching images:');
                matchingImages.forEach(img => {
                    console.log(`  - src: ${img.src}`);
                    console.log(`    alt: ${img.alt}`);
                    console.log(`    class: ${img.className}`);
                });
            } else {
                console.log('❌ No matching images found');
                console.log('\nFirst 5 images on page:');
                allImages.slice(0, 5).forEach((img, idx) => {
                    console.log(`  ${idx + 1}. ${img.src.substring(0, 80)}...`);
                });
            }
        }

        console.log('\n\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
        await new Promise(r => setTimeout(r, 30000));

    } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
    } finally {
        await browser.close();
    }
}

debugChippinImages();
