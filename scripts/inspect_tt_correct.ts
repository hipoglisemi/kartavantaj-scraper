import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspect() {
    const url = 'https://bireysel.turktelekom.com.tr/bi-dunya-firsat'; // Verified candidate
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        console.log('Title:', $('title').text());

        let count = 0;
        // Count cards
        // Common TT class: .card, .campaign, .firsat
        // Or simple <a> tags with images
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const img = $(el).find('img').attr('src');
            if (href && img && href.includes('kampanya') && !href.includes('evde-internet')) {
                console.log(`Potential Campaign: ${href}`);
                count++;
            }
        });
        console.log(`Found ${count} potential campaigns.`);

        if ($('#__NEXT_DATA__').length) console.log('✅ Has __NEXT_DATA__');
        else console.log('❌ No __NEXT_DATA__');

    } catch (e) {
        console.error(e);
    }
}
inspect();
