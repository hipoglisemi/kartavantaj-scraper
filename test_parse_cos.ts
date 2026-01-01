import { parseWithGemini } from './src/services/geminiParser';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config();

async function testParse() {
    const html = fs.readFileSync('cos_campaign.html', 'utf-8');
    const $ = cheerio.load(html);
    const jsonStr = $('#wings-web-app-state').text();
    const cleanJson = jsonStr.replace(/&q;/g, '"');
    let content = "";
    try {
        const data = JSON.parse(cleanJson);
        for (const key in data) {
            if (key.includes('api/page')) {
                const campaignData = data[key].body.data.find((d: any) => d.componentname === 'campaign_detail');
                if (campaignData) {
                    content = campaignData.data.detail_content;
                }
            }
        }
    } catch (e) { }

    if (!content) {
        console.error('No content found');
        return;
    }

    console.log('🤖 Parsing with Gemini...');
    const result = await parseWithGemini(content, 'https://www.wingscard.com.tr/kampanyalar/cosda-6-taksit', 'Akbank', 'Wings');
    console.log('\n--- RESULT ---');
    console.log(JSON.stringify(result, null, 2));
}

testParse();
