import axios from 'axios';
import * as cheerio from 'cheerio';

async function deepDebug() {
    const url = 'https://www.turkcell.com.tr/kampanyalar/marka-kampanyalari/marka-kampanyalari/turkcell-cocuk-sinema-kampanyasi';
    console.log(`🎯 Testing URL: ${url}`);

    try {
        const { data, status } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://www.turkcell.com.tr/kampanyalar/marka-kampanyalari/marka-kampanyalari',
                'Cookie': 'security=true' // Sadece deneme
            },
            maxRedirects: 5,
            validateStatus: () => true // DONT THROW on 404
        });

        console.log(`📡 Status Code: ${status}`);

        if (status === 200) {
            const $ = cheerio.load(data);
            console.log('✅ Page Loaded!');

            // 1. Image
            const ogImage = $('meta[property="og:image"]').attr('content');
            const bannerImg = $('.campaign-detail-banner img').attr('src');
            const anyImg = $('img').map((i, el) => $(el).attr('src')).get().find(s => s?.includes('media'));

            console.log(`🖼️ OG Image: ${ogImage}`);
            console.log(`🖼️ Banner Image: ${bannerImg}`);
            console.log(`🖼️ Any Media Image: ${anyImg}`);

            // 2. Dropdowns
            // Look for common accordion classes
            const accordions = $('.m-accordion__header, .ac-header, .accordion-title');
            console.log(`📂 Accordion Headers Found: ${accordions.length}`);
            accordions.each((i, el) => console.log(`   - ${$(el).text().trim()}`));

            // Check content visibility
            const fullText = $('body').text();
            console.log(`📝 Contains 'bileti': ${fullText.includes('bileti')}`);
        } else {
            console.log('❌ Failed to fetch page. Maybe blocked?');
        }

    } catch (e: any) {
        console.error('💥 Exception:', e.message);
    }
}

deepDebug();
