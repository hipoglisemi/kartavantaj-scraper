import axios from 'axios';
import * as cheerio from 'cheerio';

async function fetchHtml(url: string) {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    return res.data;
}

async function debugUrls() {
    const urls = [
        'https://www.axess.com.tr/axess/kampanyadetay/8/21934/axess-giyim-ve-kozmetik-alisverislerinde-750-tl-chip-para-kazandiriyor',
        'https://www.axess.com.tr/axess/kampanyadetay/8/21927/vatan-bilgisayarda-3-aya-varan-taksit'
    ];

    for (const url of urls) {
        console.log(`\n--- DEBUGGING: ${url} ---`);
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        console.log('CONTENT (first 2000 chars):');
        console.log(bodyText.substring(0, 2000));
    }
}

debugUrls();
