import puppeteer from 'puppeteer-extra';
import * as dotenv from 'dotenv';

dotenv.config();

const CAMPAIGNS_URL = 'https://www.chippin.com/kampanyalar';
const BASE_URL = 'https://www.chippin.com';

async function debugChippinImageURLs() {
    console.log('🔍 Debugging Chippin Image URLs...\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`📄 Navigating to ${CAMPAIGNS_URL}...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'networkidle0', timeout: 60000 });
        await new Promise(r => setTimeout(r, 8000));

        // Extract __NEXT_DATA__
        const rawData = await page.evaluate(() => {
            const script = document.getElementById('__NEXT_DATA__');
            return script ? script.innerHTML : null;
        });

        if (!rawData) {
            console.log('❌ __NEXT_DATA__ not found');

            // Try to find images on page
            const images = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('img')).slice(0, 10).map(img => ({
                    src: img.src,
                    alt: img.alt
                }));
            });

            console.log('\nFound images on page:');
            images.forEach((img, i) => {
                console.log(`${i + 1}. ${img.src}`);
            });

            return;
        }

        const nextData = JSON.parse(rawData);
        const campaigns = nextData?.props?.pageProps?.campaigns || [];

        console.log(`✅ Found ${campaigns.length} campaigns in __NEXT_DATA__\n`);

        // Test first 3 campaigns
        for (let i = 0; i < Math.min(3, campaigns.length); i++) {
            const campaign = campaigns[i];
            const imageUrl = campaign.webBanner.startsWith('http')
                ? campaign.webBanner
                : `${BASE_URL}${campaign.webBanner}`;

            console.log(`\n--- Campaign ${i + 1}: ${campaign.webName.substring(0, 50)}... ---`);
            console.log(`webBanner field: ${campaign.webBanner}`);
            console.log(`Constructed URL: ${imageUrl}`);

            // Test if URL is accessible
            try {
                const response = await fetch(imageUrl, {
                    method: 'HEAD',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                        'Referer': 'https://www.chippin.com/'
                    }
                });
                console.log(`HTTP Status: ${response.status} ${response.statusText}`);

                if (response.ok) {
                    console.log(`✅ Image is accessible`);
                } else {
                    console.log(`❌ Image not accessible`);
                }
            } catch (error: any) {
                console.log(`❌ Fetch error: ${error.message}`);
            }

            // Try to find the actual image on the detail page
            const detailUrl = `${CAMPAIGNS_URL}/${campaign.id}`;
            console.log(`\nVisiting detail page: ${detailUrl}`);

            try {
                await page.goto(detailUrl, { waitUntil: 'networkidle0', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));

                const actualImages = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('img'))
                        .filter(img => img.src.includes('banner') || img.src.includes('campaign'))
                        .map(img => img.src);
                });

                if (actualImages.length > 0) {
                    console.log(`Found ${actualImages.length} banner/campaign images on detail page:`);
                    actualImages.forEach((src, idx) => {
                        console.log(`  ${idx + 1}. ${src}`);
                    });
                } else {
                    console.log('No banner/campaign images found on detail page');
                }
            } catch (e: any) {
                console.log(`⚠️ Could not load detail page: ${e.message}`);
            }
        }

    } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
    } finally {
        await browser.close();
    }
}

debugChippinImageURLs();
