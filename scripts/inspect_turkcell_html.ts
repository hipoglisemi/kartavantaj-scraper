import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspect() {
    try {
        const url = 'https://www.turkcell.com.tr/kampanyalar/marka-kampanyalari/marka-kampanyalari';
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        console.log('Page Title:', $('title').text());

        $('.DynamicList_list__rxT5V a').each((i, el) => {
            const title = $(el).find('h4').text().trim();
            // Check for the "problematic" ones
            if (title.includes('Defacto') || title.includes('Çocuk') || title.includes('Mobilet')) {
                console.log(`\n--- FOUND: ${title} ---`);
                console.log('HREF:', $(el).attr('href'));

                // Log Img tag if exists
                const img = $(el).find('img');
                console.log('IMG Tag:', img.length ? 'YES' : 'NO');
                if (img.length) {
                    console.log('IMG Src:', img.attr('src'));
                    console.log('IMG Data-Src:', img.attr('data-src'));
                    console.log('IMG Class:', img.attr('class'));
                }

                // Dump inner HTML to see if it's hidden elsewhere
                console.log('INNER HTML:', $(el).html()?.substring(0, 300));
            }
        });
    } catch (e) {
        console.error(e);
    }
}
inspect();
