import axios from 'axios';
import * as fs from 'fs';

async function fetchDetails() {
    try {
        // Wings Detail
        const wingsResponse = await axios.get('https://www.wingscard.com.tr/kampanyalar/onur-market-magazalarinda-100-tl-chip-para', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
        });
        fs.writeFileSync('wings_detail_sample.html', wingsResponse.data);

        // Axess Detail
        const axessResponse = await axios.get('https://www.axess.com.tr/axess/kampanyadetay/8/21967/sigorta-harcamalarina-ozel-pesin-harcamalariniza-2-taksit', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        fs.writeFileSync('axess_detail_sample.html', axessResponse.data);

        console.log('✅ Detail samples saved.');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

fetchDetails();
