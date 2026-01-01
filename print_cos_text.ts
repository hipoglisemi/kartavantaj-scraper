import * as fs from 'fs';
import * as cheerio from 'cheerio';

function extractContent() {
    const html = fs.readFileSync('cos_campaign.html', 'utf-8');
    const $ = cheerio.load(html);
    const jsonStr = $('#wings-web-app-state').text();
    const cleanJson = jsonStr.replace(/&q;/g, '"');
    try {
        const data = JSON.parse(cleanJson);
        for (const key in data) {
            if (key.includes('api/page')) {
                const campaignData = data[key].body.data.find((d: any) => d.componentname === 'campaign_detail');
                if (campaignData) {
                    const content = campaignData.data.detail_content;
                    const $$ = cheerio.load(content);
                    console.log($$.text().substring(0, 1000));
                }
            }
        }
    } catch (e) { }
}

extractContent();
