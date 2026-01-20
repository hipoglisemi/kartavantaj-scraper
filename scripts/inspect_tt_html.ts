import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspect() {
    const url = 'https://bireysel.turktelekom.com.tr/ozel-avantajlar';
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        console.log('Title:', $('title').text());

        // Find links
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const title = $(el).text().trim() || $(el).find('h3, h4, .title').text().trim();
            if (href && (href.includes('kampanya') || href.includes('firsat') || href.includes('ozel-avantajlar/'))) {
                console.log(`Link: ${title} -> ${href}`);
            }
        });

        // Check for NEXT DATA
        if ($('#__NEXT_DATA__').length) console.log('✅ Has __NEXT_DATA__');
        else console.log('❌ No __NEXT_DATA__');

    } catch (e) {
        console.error(e);
    }
}
inspect();
