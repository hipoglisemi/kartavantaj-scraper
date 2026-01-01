import axios from 'axios';
import * as fs from 'fs';

async function fetchWings() {
    try {
        const response = await axios.get('https://www.wingscard.com.tr/api/campaign/list', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.wingscard.com.tr/kampanyalar',
                'X-Requested-With': 'XMLHttpRequest'
            },
            params: {
                keyword: '',
                sector: '',
                category: '',
                page: '1'
            }
        });

        fs.writeFileSync('wings_sample.json', JSON.stringify(response.data, null, 2));
        console.log('✅ Wings sample saved to wings_sample.json');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

fetchWings();
