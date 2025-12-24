
import { normalizeBankName, normalizeCardName } from '../src/utils/bankMapper';
import * as dotenv from 'dotenv';

dotenv.config();

async function runTests() {
    console.log('🧪 Starting Normalization Tests...\n');

    const testCases = [
        { bank: 'yapikredi', card: 'world', expectedBank: 'Yapı Kredi', expectedCard: 'World' },
        { bank: 'Yapı Kredi', card: 'World', expectedBank: 'Yapı Kredi', expectedCard: 'World' },
        { bank: 'Akbank', card: 'axess', expectedBank: 'Akbank', expectedCard: 'Axess' },
        { bank: 'akbank', card: 'WINGS', expectedBank: 'Akbank', expectedCard: 'Wings' },
        { bank: 'Ziraat', card: 'Bankkart', expectedBank: 'Ziraat', expectedCard: 'Bankkart' },
        { bank: 'Ziraat Bankası', card: 'bankkart', expectedBank: 'Ziraat', expectedCard: 'Bankkart' },
        { bank: 'Halkbank', card: 'paraf', expectedBank: 'Halkbank', expectedCard: 'Paraf' },
        { bank: 'Garanti BBVA', card: 'bonus', expectedBank: 'Garanti BBVA', expectedCard: 'Bonus' },
        { bank: 'Vakıfbank', card: 'World', expectedBank: 'Vakıfbank', expectedCard: 'World' },
        // Card specific aliases if any (we should check bank_configs for these)
        { bank: 'Yapı Kredi', card: 'crystal', expectedBank: 'Yapı Kredi', expectedCard: 'Crystal' },
        { bank: 'Yapı Kredi', card: 'adios', expectedBank: 'Yapı Kredi', expectedCard: 'Adios' },
        { bank: 'Yapı Kredi', card: 'play', expectedBank: 'Yapı Kredi', expectedCard: 'Play' },
    ];

    let passed = 0;
    for (const tc of testCases) {
        process.stdout.write(`   Testing [${tc.bank}] - [${tc.card}]... `);
        const normBank = await normalizeBankName(tc.bank);
        const normCard = await normalizeCardName(normBank, tc.card);

        if (normBank === tc.expectedBank && normCard === tc.expectedCard) {
            console.log('✅ PASS');
            passed++;
        } else {
            console.log(`❌ FAIL (Got: [${normBank}] - [${normCard}], Expected: [${tc.expectedBank}] - [${tc.expectedCard}])`);
        }
    }

    console.log(`\n📊 Results: ${passed}/${testCases.length} passed.`);

    if (passed === testCases.length) {
        console.log('\n✨ All tests passed! The normalization system is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the bank_configs table or aliases logic.');
    }
}

runTests().catch(console.error);
