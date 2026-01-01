import * as fs from 'fs';
import * as cheerio from 'cheerio';

function extractContent() {
    const html = fs.readFileSync('cos_campaign.html', 'utf-8');
    const $ = cheerio.load(html);
    const jsonStr = $('#wings-web-app-state').text();

    // The JSON is escaped with &q;
    const cleanJson = jsonStr.replace(/&q;/g, '"');
    try {
        const data = JSON.parse(cleanJson);
        // Find the campaign detail entry
        for (const key in data) {
            if (key.includes('api/page')) {
                const campaignData = data[key].body.data.find((d: any) => d.componentname === 'campaign_detail');
                if (campaignData) {
                    console.log('--- TITLE ---');
                    console.log(campaignData.data.title);
                    console.log('\n--- CONTENT ---');
                    console.log(campaignData.data.detail_content);
                }
            }
        }
    } catch (e: any) {
        console.error('Error parsing JSON:', e.message);
    }
}

extractContent();
