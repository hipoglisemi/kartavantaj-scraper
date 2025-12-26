import axios from 'axios';
import { extractDirectly } from './src/utils/dataExtractor';

async function testExtractor() {
    const url = 'https://www.axess.com.tr/axess/kampanyadetay/8/21943/axesse-ozel-carrefoursa-magazalarinda-250-tl-chip-para';
    console.log(`🔍 Testing Extractor on: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const title = "Axess’e özel CarrefourSA mağazalarında 250 TL chip-para!";
        const masterBrands = ["CarrefourSA", "Teknosa", "Migros"];
        const extracted = await extractDirectly(response.data, title, masterBrands);

        console.log('\n--- EXTRACTED RESULTS ---');
        console.log(JSON.stringify(extracted, null, 2));

    } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
    }
}

testExtractor();
