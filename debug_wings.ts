import axios from 'axios';
import { cleanCampaignText } from './src/utils/textCleaner';

async function test() {
    const response = await axios.get('https://www.wingscard.com.tr/kampanyalar/onur-market-magazalarinda-100-tl-chip-para');
    let html = response.data;
    
    let decoded = html
        .replace(/&q;/g, '"')
        .replace(/&l;/g, '<')
        .replace(/&g;/g, '>')
        .replace(/&ndash;/g, '-')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
        
    const text = cleanCampaignText(decoded).substring(0, 30000);
    console.log('Text length:', text.length);
    console.log('Contains Onur Market:', text.includes('Onur Market'));
    console.log('Contains 31 Ocak:', text.includes('31 Ocak'));
    console.log('First 1000 chars:', text.substring(0, 1000));
}

test();
