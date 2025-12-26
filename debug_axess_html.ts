import axios from 'axios';
import * as cheerio from 'cheerio';

async function debugAxessHtml() {
    const url = 'https://www.axess.com.tr/axess/kampanyadetay/8/21943/axesse-ozel-carrefoursa-magazalarinda-250-tl-chip-para';
    console.log(`🔍 Fetching: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const title = $('h2.pageTitle').text().trim();
        const content = $('.cmsContent.clearfix').text().trim();
        const image = $('.campaingDetailImage img').attr('src');

        console.log('\n--- EXTRACTED DATA ---');
        console.log(`Title: ${title}`);
        console.log(`Image: ${image}`);
        console.log('\n--- CONTENT SNIPPET ---');
        console.log(content.substring(0, 1000));

        // Let's look for dates
        const dateRegex = /\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\d{4}/g;
        const dates = content.match(dateRegex);
        console.log('\n--- DATES FOUND ---');
        console.log(dates);

    } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
    }
}

debugAxessHtml();
