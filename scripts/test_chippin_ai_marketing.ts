import puppeteer from 'puppeteer-extra';
import { parseWithGemini } from '../src/services/geminiParser';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSingleCampaign() {
    console.log('🧪 Testing AI Marketing Text Generation for Chippin...\n');

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

        // Take first campaign as test
        const testCampaign = campaigns[0];

        console.log('📋 Test Campaign:');
        console.log(`   Title: ${testCampaign.webName}`);
        console.log(`   Description: ${testCampaign.webDescription.substring(0, 100)}...\n`);

        const campaignHtml = `
            <h1>${testCampaign.webName}</h1>
            <div class="description">${testCampaign.webDescription}</div>
        `;

        console.log('🤖 Calling Gemini AI...\n');
        const result = await parseWithGemini(campaignHtml, 'https://test.com', 'Chippin', 'Chippin');

        if (result) {
            console.log('✅ AI Response:');
            console.log('─'.repeat(60));
            console.log(`📝 ai_marketing_text: "${result.ai_marketing_text}"`);
            console.log(`   Word count: ${result.ai_marketing_text?.split(/\s+/).length || 0}`);
            console.log(`\n💰 earning: "${result.earning}"`);
            console.log(`📄 description (from AI): "${result.description?.substring(0, 100)}..."`);
            console.log('─'.repeat(60));

            // Simulate chippin.ts logic
            let finalDescription = '';
            if (result.ai_marketing_text) {
                finalDescription = result.ai_marketing_text;
            } else if (result.earning) {
                finalDescription = result.earning;
            }

            const words = finalDescription.trim().split(/\s+/);
            if (words.length > 10) {
                console.log(`\n✂️ Would truncate from ${words.length} to 10 words`);
                finalDescription = words.slice(0, 10).join(' ');
            }

            console.log(`\n🎯 Final description field: "${finalDescription}"`);
            console.log(`   Final word count: ${finalDescription.split(/\s+/).length}`);
        } else {
            console.log('❌ AI parsing failed');
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

testSingleCampaign();
