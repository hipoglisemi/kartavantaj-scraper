import puppeteer from 'puppeteer-extra';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const CAMPAIGNS_URL = 'https://www.chippin.com/kampanyalar';

async function inspectChippinPage() {
    console.log('🔍 Inspecting Chippin Page Structure...\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`📄 Navigating to ${CAMPAIGNS_URL}...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'networkidle0', timeout: 60000 });

        console.log('⏳ Waiting for content to load...');
        await new Promise(r => setTimeout(r, 8000));

        // Check for __NEXT_DATA__
        const hasNextData = await page.evaluate(() => {
            const script = document.getElementById('__NEXT_DATA__');
            return !!script;
        });
        console.log(`\n__NEXT_DATA__ found: ${hasNextData ? '✅ YES' : '❌ NO'}`);

        // Check all script tags
        const scripts = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('script')).map(s => ({
                id: s.id,
                type: s.type,
                src: s.src,
                hasContent: s.innerHTML.length > 0,
                contentPreview: s.innerHTML.substring(0, 100)
            }));
        });

        console.log(`\nFound ${scripts.length} script tags:`);
        scripts.forEach((s, i) => {
            if (s.id || s.hasContent) {
                console.log(`  ${i + 1}. ID: ${s.id || 'none'}, Type: ${s.type || 'none'}, Has content: ${s.hasContent}`);
                if (s.hasContent && !s.src) {
                    console.log(`     Preview: ${s.contentPreview}...`);
                }
            }
        });

        // Look for campaign cards/elements
        console.log('\n🔍 Looking for campaign elements...');

        const selectors = [
            'div[class*="campaign"]',
            'div[class*="card"]',
            'a[href*="kampanya"]',
            'img[alt*="kampanya"]',
            'article',
            '[data-testid*="campaign"]'
        ];

        for (const selector of selectors) {
            const count = await page.evaluate((sel) => {
                return document.querySelectorAll(sel).length;
            }, selector);
            if (count > 0) {
                console.log(`  ✅ ${selector}: ${count} elements`);
            }
        }

        // Get page HTML
        const html = await page.content();
        fs.writeFileSync('chippin_page_structure.html', html);
        console.log('\n💾 Saved page HTML to: chippin_page_structure.html');

        // Check for React/Next.js root
        const hasReactRoot = await page.evaluate(() => {
            const root = document.getElementById('__next') || document.getElementById('root');
            return !!root;
        });
        console.log(`React/Next.js root found: ${hasReactRoot ? '✅ YES' : '❌ NO'}`);

        // Try to find campaign data in window object
        const windowData = await page.evaluate(() => {
            const keys = Object.keys(window).filter(k =>
                k.toLowerCase().includes('campaign') ||
                k.toLowerCase().includes('data') ||
                k.toLowerCase().includes('props')
            );
            return keys;
        });

        if (windowData.length > 0) {
            console.log('\n🔍 Found potential data keys in window object:');
            windowData.forEach(k => console.log(`  - ${k}`));
        }

    } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
    } finally {
        await browser.close();
    }
}

inspectChippinPage();
