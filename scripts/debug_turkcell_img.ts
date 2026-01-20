import axios from 'axios';
import * as cheerio from 'cheerio';

async function check() {
    try {
        const url = 'https://www.turkcell.com.tr/kampanyalar/marka-kampanyalari/marka-kampanyalari/defacto-hediye-ceki';
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
        });
        const $ = cheerio.load(data);
        console.log('OG Image:', $('meta[property="og:image"]').attr('content'));
        console.log('Class Image:', $('.campaign-detail-image img').attr('src'));
        console.log('Detail Banner:', $('.campaign-detail-banner img').attr('src'));
    } catch (e) {
        console.error(e);
    }
}
check();
