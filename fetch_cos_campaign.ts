import axios from 'axios';
import * as fs from 'fs';

async function fetchCampaign() {
    try {
        const response = await axios.get('https://www.wingscard.com.tr/kampanyalar/cosda-6-taksit', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
        });
        fs.writeFileSync('cos_campaign.html', response.data);
        console.log('✅ COS campaign saved.');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

fetchCampaign();
