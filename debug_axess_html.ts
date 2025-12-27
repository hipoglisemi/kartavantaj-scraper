
import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractDirectly } from './src/utils/dataExtractor';

async function auditCampaign() {
    // A complex campaign URL from previous logs
    const url = 'https://www.axess.com.tr/axess/kampanyadetay/8/21920/carrefoursanin-yeni-dijital-cuzdani-payfourdan-tek-seferde-yapacaginiz-3000-tl-ve-uzeri-ilk-yuklemenize-150-tl-chip-para';

    console.log(`🔍 Fetching: ${url}`);
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = res.data;
    const $ = cheerio.load(html);

    // Extract valid title from page first
    const title = $('h1').first().text().trim() || $('.campaign-detail-title').text().trim() || 'No Title';
    console.log(`📑 Title: ${title}`);

    // Extract using our logic (pass raw HTML and title)
    // Note: extractDirectly is async
    const extracted = await extractDirectly(html, title, []);

    console.log('\n--- 🤖 Extracted Data (JSON) ---');
    console.log(JSON.stringify(extracted, null, 2));

    console.log('\n--- 📝 Raw Description (First 500 chars) ---');
    console.log(extracted.description?.substring(0, 500));
}

auditCampaign();
