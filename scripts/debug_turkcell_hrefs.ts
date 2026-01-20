import axios from 'axios';
import * as cheerio from 'cheerio';

async function check() {
    try {
        const url = 'https://www.turkcell.com.tr/kampanyalar/marka-kampanyalari/marka-kampanyalari';
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        $('.DynamicList_list__rxT5V a').each((i, el) => {
            if (i < 5) console.log('HREF:', $(el).attr('href'));
        });
    } catch (e) {
        console.error(e);
    }
}
check();
