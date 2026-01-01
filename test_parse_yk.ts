import { parseWithGemini } from './src/services/geminiParser';
import * as fs from 'fs';

async function testYK() {
    console.log('Testing Yapı Kredi Parser...');
    const html = fs.readFileSync('yk_sample.html', 'utf-8');
    const url = 'https://www.worldcard.com.tr/kampanyalar/opet-worldcard-ile-turk-hava-yollari-ajet-pegasus-ve-sunexpresste-4000-tl-ve-uzeri-harcamaniza-ocak';

    // Simulate what the scraper sends
    const result = await parseWithGemini(html, url, 'Yapı Kredi', 'World');

    console.log('\n--- RESULT ---');
    console.log(JSON.stringify(result, null, 2));
}

testYK();
