import axios from 'axios';
import * as fs from 'fs';

async function fetchAxess() {
    try {
        const response = await axios.get('https://www.axess.com.tr/ajax/kampanya-ajax.aspx', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.axess.com.tr/kampanyalar',
                'X-Requested-With': 'XMLHttpRequest'
            },
            params: {
                'checkBox': '[0]',
                'searchWord': '""',
                'page': '1'
            }
        });

        fs.writeFileSync('axess_sample.html', response.data);
        console.log('✅ Axess sample saved to axess_sample.html');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

fetchAxess();
