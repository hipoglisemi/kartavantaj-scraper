import { parseWithGemini } from './src/services/geminiParser';

// Mock snippets for testing (simulating crucial parts of HTML)
const SAMPLES = {
    garanti: {
        bank: 'Garanti BBVA',
        card: 'Bonus',
        url: 'https://bonus.com.tr/test',
        html: `<h1>Market Alışverişlerinize 100 TL Bonus</h1>
               <p>BonusFlaş'tan kampanyaya katılın, Garanti BBVA Bonus kartlarınızla markette 1000 TL harcayın, 100 TL Bonus kazanın. Flexi ve Money Bonus dahildir.</p>`
    },
    halkbank: {
        bank: 'Halkbank',
        card: 'Paraf',
        url: 'https://paraf.com.tr/test',
        html: `<h1>Restoran Harcamalarına %10 ParafPara</h1>
               <p>Paraf Mobil'den katıl butonuna tıklayın. Paraf, Parafly ve Paraf Genç ile yapacağınız harcamalarda geçerlidir. SMS ile katılım için RESTORAN yazıp 3404'e gönderin.</p>`
    },
    vakifbank: {
        bank: 'Vakıfbank',
        card: 'VakıfBank World',
        url: 'https://vakifkart.com.tr/test',
        html: `<h1>Giyimde 100 TL Worldpuan</h1>
               <p>Cepte Kazan üzerinden katılın. VakıfBank Worldcard ve Bankomat Kart ile yapılan alışverişlerde geçerlidir.</p>`
    },
    ziraat: {
        bank: 'Ziraat',
        card: 'Bankkart',
        url: 'https://bankkart.com.tr/test',
        html: `<h1>Akaryakıta 75 TL Bankkart Lira</h1>
               <p>Bankkart Mobil ile katılım sağlayabilirsiniz. Kampanyadan Bankkart ve Bankkart Başak kart sahipleri faydalanabilir.</p>`
    },
    isbankasi: {
        bank: 'İş Bankası',
        card: 'Maximum',
        url: 'https://maximum.com.tr/test',
        html: `<h1>E-Ticaret Alışverişlerinize 200 TL Maxipuan</h1>
               <p>Maximum Mobil veya İşCep uygulamasından katılabilirsiniz. Maximum Kart ve Maximiles kartlar dahildir.</p>`
    }
};

async function testAll() {
    console.log('🚀 Testing AI Parsing for All Banks...\n');

    for (const [key, data] of Object.entries(SAMPLES)) {
        console.log(`--- Testing ${data.bank} ---`);
        try {
            const result = await parseWithGemini(data.html, data.url, data.bank, data.card);
            console.log(`✅ ${data.bank} Result:`);
            console.log(`   Earning: ${result.earning}`);
            console.log(`   Cards: ${result.eligible_customers?.join(', ')}`);
            console.log(`   Participation: ${result.participation_method}`);
            console.log('-----------------------------------');
        } catch (e) {
            console.error(`❌ Error in ${data.bank}:`, e);
        }
    }
}

testAll();
