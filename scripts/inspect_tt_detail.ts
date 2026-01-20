import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspectDetail() {
    const url = 'https://bireysel.turktelekom.com.tr/bi-dunya-firsat/flo-kampanyasi'; // Example
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        console.log('Title:', $('h1').text());
        console.log('Date:', $('.date').text() || 'No .date');
        console.log('Content Length:', $('.content, .detail, main').text().length);
        console.log('Sample Content:', $('.content, .detail, main').text().substring(0, 200));
        console.log('Image:', $('.banner img, .detail img').attr('src'));
    } catch (e) {
        console.error(e);
    }
}
inspectDetail();
