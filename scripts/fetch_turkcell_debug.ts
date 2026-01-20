import axios from 'axios';
import fs from 'fs';

async function fetchTurkcell() {
    try {
        const response = await axios.get('https://www.turkcell.com.tr/kampanyalar/marka-kampanyalari/marka-kampanyalari', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        fs.writeFileSync('/tmp/turkcell.html', response.data);
        console.log('✅ Fetched Turkcell HTML');
    } catch (error) {
        console.error('❌ Error fetching:', error.message);
    }
}
fetchTurkcell();
