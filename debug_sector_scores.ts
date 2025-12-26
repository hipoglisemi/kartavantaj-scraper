import * as cheerio from 'cheerio';
import axios from 'axios';

const SECTORS = [
    { slug: 'market-gida', name: 'Market & Gıda', keywords: ['migros', 'carrefoursa', 'şok market', 'a101', 'bim', 'getir', 'yemeksepeti market', 'kasap', 'şarküteri', 'fırın'] },
    { slug: 'akaryakit', name: 'Akaryakıt', keywords: ['shell', 'opet', 'bp', 'petrol ofisi', 'totalenergies', 'akaryakıt', 'benzin', 'motorin', 'lpg', 'istasyon'] },
    { slug: 'giyim-aksesuar', name: 'Giyim & Aksesuar', keywords: ['boyner', 'zara', 'h&m', 'mango', 'lcw', 'koton', 'giyim', 'ayakkabı', 'çanta', 'moda', 'aksesuar', 'takı', 'saat'] },
    { slug: 'restoran-kafe', name: 'Restoran & Kafe', keywords: ['restoran', 'yemeksepeti', 'getir yemek', 'starbucks', 'kahve', 'cafe', 'kafe', 'burger king', 'mcdonalds', 'fast food'] },
    { slug: 'elektronik', name: 'Elektronik', keywords: ['teknosa', 'vatan bilgisayar', 'media markt', 'apple', 'samsung', 'elektronik', 'beyaz eşya', 'telefon', 'bilgisayar', 'tablet', 'laptop', 'televizyon'] },
    { slug: 'mobilya-dekorasyon', name: 'Mobilya & Dekorasyon', keywords: ['ikea', 'koçtaş', 'bauhaus', 'mobilya', 'dekorasyon', 'ev tekstili', 'yatak', 'mutfak', 'halı'] },
    { slug: 'kozmetik-saglik', name: 'Kozmetik & Sağlık', keywords: ['gratis', 'watsons', 'rossmann', 'sephora', 'kozmetik', 'kişisel bakım', 'eczane', 'sağlık', 'hastane', 'doktor', 'parfüm'] },
    { slug: 'e-ticaret', name: 'E-Ticaret', keywords: ['trendyol', 'hepsiburada', 'amazon', 'n11', 'pazarama', 'çiçeksepeti', 'e-ticaret', 'online alışveriş'] },
    { slug: 'ulasim', name: 'Ulaşım', keywords: ['thy', 'pegasus', 'türk hava yolları', 'havayolu', 'otobüs', 'ulaşım', 'araç kiralama', 'rent a car', 'martı', 'bitaksi', 'uber'] },
    { slug: 'dijital-platform', name: 'Dijital Platform', keywords: ['netflix', 'spotify', 'youtube premium', 'exxen', 'disney+', 'steam', 'playstation', 'xbox', 'dijital platform', 'oyun'] },
    { slug: 'kultur-sanat', name: 'Kültür & Sanat', keywords: ['sinema', 'tiyatro', 'konser', 'biletix', 'itunes', 'kitap', 'etkinlik', 'müze', 'sanat'] },
    { slug: 'egitim', name: 'Eğitim', keywords: ['okul', 'üniversite', 'kırtasiye', 'kurs', 'eğitim', 'öğrenim'] },
    { slug: 'sigorta', name: 'Sigorta', keywords: ['sigorta', 'kasko', 'poliçe', 'emeklilik'] },
    { slug: 'otomotiv', name: 'Otomotiv', keywords: ['otomotiv', 'servis', 'bakım', 'yedek parça', 'lastik', 'araç', 'oto'] },
    { slug: 'vergi-kamu', name: 'Vergi & Kamu', keywords: ['vergi', 'mtv', 'belediye', 'e-devlet', 'kamu', 'fatura'] },
    { slug: 'turizm-konaklama', name: 'Turizm & Konaklama', keywords: ['otel', 'tatil', 'konaklama', 'turizm', 'acente', 'jolly tur', 'etstur', 'setur', 'yurt dışı', 'seyahat'] }
];

async function debugSector(url: string) {
    console.log(`\n🔍 Debugging Sector for: ${url}`);
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(res.data);
    const content = $('.cmsContent').text().toLowerCase();

    const scores = SECTORS.map(sector => {
        let matchedKeywords: string[] = [];
        let score = 0;
        for (const kw of sector.keywords) {
            const matches = content.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
            if (matches) {
                score += matches.length;
                matchedKeywords.push(`${kw} (${matches.length})`);
            }
        }
        return { ...sector, score, matchedKeywords };
    });

    console.log('--- SECTOR MATCHING SCORES ---');
    scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score).forEach(s => {
        console.log(`[${s.name}]: Score ${s.score}. Matches: ${s.matchedKeywords.join(', ')}`);
    });
}

debugSector('https://www.axess.com.tr/axess/kampanyadetay/8/21931/daikinde-pesin-fiyatina-12-taksit');
debugSector('https://www.axess.com.tr/axess/kampanyadetay/8/21935/akbank-troy-logolu-kartlariniza-ozel-turk-hava-yollari-biletleri-500-tl-indirimli');
