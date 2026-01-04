import puppeteer from 'puppeteer-extra';
import * as dotenv from 'dotenv';

dotenv.config();

async function inspectNextData() {
    console.log('🔍 Inspecting __NEXT_DATA__ structure...\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('📄 Navigating to Chippin campaigns page...');
        await page.goto('https://www.chippin.com/kampanyalar', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 6000));

        const rawData = await page.evaluate(() => {
            const script = document.getElementById('__NEXT_DATA__');
            return script ? script.innerHTML : null;
        });

        if (!rawData) {
            throw new Error('Could not find __NEXT_DATA__');
        }

        const nextData = JSON.parse(rawData);
        const campaigns = nextData?.props?.pageProps?.campaigns || [];

        // Take first campaign
        const campaign = campaigns[0];

        console.log('📋 First Campaign Structure:');
        console.log('─'.repeat(80));
        console.log(JSON.stringify(campaign, null, 2));
        console.log('─'.repeat(80));

        console.log('\n🔑 Available Keys:');
        console.log(Object.keys(campaign));

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

inspectNextData();
