import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function dumpNextData() {
    const url = 'https://www.turkcell.com.tr/kampanyalar/marka-kampanyalari/marka-kampanyalari/turkcell-cocuk-sinema-kampanyasi';
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            }
        });
        const $ = cheerio.load(data);
        const scriptContent = $('#__NEXT_DATA__').html();
        if (scriptContent) {
            fs.writeFileSync('turkcell_next_data.json', scriptContent);
            console.log('✅ Dumped __NEXT_DATA__ to turkcell_next_data.json');

            // Quick peek
            const json = JSON.parse(scriptContent);
            console.log('Root Keys:', Object.keys(json));
            // Try to find image
            const str = scriptContent;
            const imgMatch = str.match(/"([^"]+\.(png|jpg|jpeg|webp))"/g);
            console.log('Found Image-like Strings:', imgMatch?.slice(0, 5));
        } else {
            console.log('❌ No __NEXT_DATA__ script found.');
        }
    } catch (e) {
        console.error(e);
    }
}
dumpNextData();
