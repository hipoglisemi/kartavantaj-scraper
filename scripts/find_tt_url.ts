import axios from 'axios';

const candidates = [
    'https://bireysel.turktelekom.com.tr/mobil/web/kampanyalar/sayfalar/bi-dunya-firsat-kampanyalari.aspx',
    'https://bireysel.turktelekom.com.tr/ozel-avantajlar',
    'https://www.turktelekom.com.tr/bi-dunya-firsat',
    'https://bireysel.turktelekom.com.tr/kampanyalar/sayfalar/bi-dunya-firsat.aspx',
    'https://bi-dunya-firsat.turktelekom.com.tr',
    'https://bireysel.turktelekom.com.tr/mobil/kampanyalar/bi-dunya-firsat'
];

async function check() {
    for (const url of candidates) {
        try {
            const { status, headers } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                validateStatus: () => true,
                maxRedirects: 5
            });
            console.log(`[${status}] ${url} -> ${headers['location'] || 'Final'}`);
        } catch (e: any) {
            console.log(`[ERR] ${url}: ${e.message}`);
        }
    }
}
check();
