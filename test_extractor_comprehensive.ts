import { extractDates, extractMinSpend, extractEarning, extractValidCards, extractJoinMethod } from './src/utils/dataExtractor';

const testCases = {
    dates: [
        { text: "Kampanya 31 Aralık 2025 tarihine kadar geçerlidir.", expected: "2025-12-31" },
        { text: "Son gün: 15 Ocak 2026.", expected: "2026-01-15" },
        { text: "Geçerlilik: 31.12.2025", expected: "2025-12-31" },
    ],
    amounts: [
        { text: "250 TL chip-para kazanmak için 3.000 TL harcama yapın.", expectedMinSpend: 3000, expectedEarning: "250 TL chip-para" },
        { text: "Tek seferde yapacağınız 2500 - 5000 TL arası alışverişlerde.", expectedMinSpend: 2500, expectedEarning: null },
        { text: "Her 1000 TL üzeri harcamaya 50 TL puan.", expectedMinSpend: 1000, expectedEarning: "50 TL puan" }
    ],
    cards: [
        { text: "Kampanya sadece Axess ve Wings sahipleri içindir.", expected: "Axess, Wings" },
        { text: "Free kartlar kampanyaya dahil değildir.", expected: "" }
    ],
    join: [
        { text: "Juzdan ile Hemen Katıl butonuna tıklayın.", expected: "Juzdan ile Katıl" },
        { text: "KAYIT yazıp 4566'ya SMS gönderin.", expected: "SMS ile Katıl" }
    ]
};

console.log('🧪 Starting Comprehensive Extractor Tests...\n');

console.log('📅 Testing Dates:');
testCases.dates.forEach(t => {
    const res = extractDates(t.text);
    console.log(`   Input: "${t.text}" => Got: ${res.until} (Expected: ${t.expected})`);
});

console.log('\n💰 Testing Amounts:');
testCases.amounts.forEach(t => {
    const spend = extractMinSpend(t.text);
    const earn = extractEarning("Test Title", t.text);
    console.log(`   Input: "${t.text}"`);
    console.log(`      MinSpend: ${spend} (Expected: ${t.expectedMinSpend})`);
    console.log(`      Earning:  ${earn} (Expected: ${t.expectedEarning})`);
});

console.log('\n💳 Testing Cards:');
testCases.cards.forEach(t => {
    const cards = extractValidCards(t.text);
    console.log(`   Input: "${t.text}" => Got: ${cards.join(', ')} (Expected: ${t.expected})`);
});

console.log('\n📱 Testing Join Method:');
testCases.join.forEach(t => {
    const method = extractJoinMethod(t.text);
    console.log(`   Input: "${t.text}" => Got: ${method} (Expected: ${t.expected})`);
});
