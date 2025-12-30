import * as dotenv from 'dotenv';
dotenv.config();

import { parseWithGemini } from '../src/services/geminiParser';

async function runTests() {
    console.log('🧪 Python Model Integration Testi Başlatılıyor...\n');

    const testCases = [
        {
            name: "Tiered Reward (Katlanan)",
            text: `
                World'e özel 1-31 Ocak 2024 tarihleri arasında farklı günlerde yapacağınız her 2.500 TL ve üzeri market harcamanıza 250 TL, toplam 1.000 TL Worldpuan!
                Kampanyaya katılım için World Mobil uygulamasından Hemen Katıl butonuna tıklanmalıdır.
            `,
            expected: {
                min_spend: 10000, // (1000/250) * 2500
                max_discount: 1000,
                earning: "1.000 TL Puan"
            }
        },
        {
            name: "Percentage with Max Limit",
            text: `
                Hepsiburada'da yapacağınız alışverişlerinizde %15 indirim!
                Kampanya kapsamında kazanılabilecek maksimum indirim tutarı 750 TL'dir.
                Bireysel kredi kartları ve banka kartları ile yapılan işlemler dahildir.
            `,
            expected: {
                min_spend: 5000, // 750 / 0.15
                max_discount: 750,
                earning: "%15 (max 750TL)"
            }
        },
        {
            name: "Multi-transaction Fixed Reward",
            text: `
                Giyim sektöründe farklı günlerde yapacağınız 3 adet 1.500 TL ve üzeri harcamanıza 450 TL puan hediye!
                Kampanyadan her müşteri bir kez yararlanabilir.
            `,
            expected: {
                min_spend: 4500, // 3 * 1500
                max_discount: 450,
                earning: "450 TL Puan"
            }
        },
        {
            name: "Range-based Installment (No reward)",
            text: `
                IKEA mağazalarından yapacağınız 2.000 TL - 50.000 TL arası alışverişlerinizde vade farksız 6 taksit fırsatı!
            `,
            expected: {
                min_spend: 2000,
                max_discount: 0,
                earning: "Vade Farksız"
            }
        },
        {
            name: "Complex Tiered (Business)",
            text: `
                Axess Business sahiplerine özel akaryakıt kampanyası!
                Her 1.000 TL ve üzeri akaryakıt harcamanıza 75 TL, toplam 300 TL chip-para!
            `,
            expected: {
                min_spend: 4000, // (300/75) * 1000
                max_discount: 300
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n---------------------------------------------------------`);
        console.log(`📝 Test Case: ${testCase.name}`);
        console.log(`---------------------------------------------------------`);

        try {
            const result = await parseWithGemini(testCase.text, "https://test.url", "Test Bank", "Test Card");

            console.log(`\n✅ SONUÇLAR:`);
            console.log(`   Başlık: ${result.title}`);
            console.log(`   Kategori: ${result.category}`);
            console.log(`   Earning: ${result.earning} (Beklenen: ${testCase.expected?.earning || 'N/A'})`);
            console.log(`   min_spend: ${result.min_spend} (Beklenen: ${testCase.expected?.min_spend || 'N/A'})`);
            console.log(`   max_discount: ${result.max_discount} (Beklenen: ${testCase.expected?.max_discount || 'N/A'})`);

            // Check accuracy
            if (testCase.expected) {
                const msDiff = Math.abs((result.min_spend || 0) - (testCase.expected.min_spend || 0));
                const mdDiff = Math.abs((result.max_discount || 0) - (testCase.expected.max_discount || 0));

                if (msDiff < 10 && mdDiff < 10) {
                    console.log(`\n🎯 DOĞRULUK: %100 UYUMLU`);
                } else {
                    console.log(`\n⚠️  SAPMA TESPİT EDİLDİ!`);
                    if (msDiff >= 10) console.log(`   ❌ min_spend hatalı: ${result.min_spend} vs ${testCase.expected.min_spend}`);
                    if (mdDiff >= 10) console.log(`   ❌ max_discount hatalı: ${result.max_discount} vs ${testCase.expected.max_discount}`);
                }
            }
        } catch (error: any) {
            console.error(`\n❌ HATA: ${error.message}`);
        }
    }
}

runTests();
