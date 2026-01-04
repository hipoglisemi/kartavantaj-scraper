import puppeteer from 'puppeteer-extra';
import { downloadImageDirectly } from '../src/services/imageService';
import * as dotenv from 'dotenv';

dotenv.config();

const CAMPAIGNS_URL = 'https://www.chippin.com/kampanyalar';
const BASE_URL = 'https://www.chippin.com';

async function testRealChippinImages() {
    console.log('🧪 Testing Real Chippin Image Download...\n');

    const browser = await puppeteer.launch({
        headless: true,
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
        const testLimit = Math.min(3, campaigns.length);
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < testLimit; i++) {
            const campaign = campaigns[i];
            const title = campaign.webName.trim();
            const imageUrl = campaign.webBanner.startsWith('http')
                ? campaign.webBanner
                : `${BASE_URL}${campaign.webBanner}`;

            console.log(`\n--- Test ${i + 1}/${testLimit}: ${title.substring(0, 50)}... ---`);
            console.log(`Original URL: ${imageUrl}`);

            const result = await downloadImageDirectly(imageUrl, title, 'chippin');

            if (result.includes('supabase')) {
                console.log(`✅ SUCCESS: Uploaded to Supabase`);
                successCount++;
            } else {
                console.log(`❌ FAILED: Fell back to original URL`);
                failCount++;
            }
        }

        console.log(`\n\n📊 Test Results:`);
        console.log(`   ✅ Success: ${successCount}/${testLimit}`);
        console.log(`   ❌ Failed: ${failCount}/${testLimit}`);

        if (successCount === testLimit) {
            console.log('\n🎉 All tests passed! Image download is working correctly.');
        } else if (successCount > 0) {
            console.log('\n⚠️  Partial success - some images downloaded correctly.');
        } else {
            console.log('\n❌ All tests failed - check error messages above.');
        }

    } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
    } finally {
        await browser.close();
    }
}

testRealChippinImages();
