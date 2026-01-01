import axios from 'axios';
import * as fs from 'fs';

const LIST_URL = 'https://www.worldcard.com.tr/api/campaigns?campaignSectorId=6d897e71-1849-43a3-a64f-62840e8c0442&campaignSectorKey=tum-kampanyalar';
const BASE_URL = 'https://www.worldcard.com.tr';

async function fetchSample() {
    try {
        console.log('Fetching list...');
        const r1 = await axios.get(LIST_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Referer': 'https://www.worldcard.com.tr/kampanyalar',
                'page': '1'
            }
        });

        const items = r1.data.Items;
        console.log(`Found ${items.length} items`);

        if (items.length > 0) {
            const firstItem = items[0];
            console.log('Sample Item:', JSON.stringify(firstItem, null, 2));
            const detailUrl = new URL(firstItem.Url, BASE_URL).toString();
            console.log(`Fetching detail: ${detailUrl}`);

            const r2 = await axios.get(detailUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
            });

            fs.writeFileSync('yk_sample.html', r2.data);
            console.log('Saved yk_sample.html');
        }
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

fetchSample();
