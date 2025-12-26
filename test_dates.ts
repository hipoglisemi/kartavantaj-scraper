import { extractDates } from './src/utils/dataExtractor';

const testCases = [
    { text: "31 Aralık 2024 tarihine kadar geçerlidir.", expected: { from: null, until: "2024-12-31" } },
    { text: "Kampanya 1-31 Ocak 2025 tarihleri arasında geçerlidir.", expected: { from: "2025-01-01", until: "2025-01-31" } },
    { text: "30 Nisan'a kadar Wings ile yapacağınız harcamalarda...", expected: { from: null, until: "2026-04-30" } }, // Dec 2025 -> April 2026
    { text: "15 Ekim - 15 Kasım tarihleri arasında", expected: { from: "2025-10-15", until: "2025-11-15" } },
    { text: "Ocak sonuna kadar geçerlidir.", expected: { from: null, until: "2026-01-31" } }, // Dec 2025 -> Jan 2026
    { text: "Puan kullanım tarihi 31.01.2025'tir. Kampanya 31 Aralık 2024'e kadar geçerli.", expected: { from: null, until: "2024-12-31" } }
];

async function runTests() {
    console.log('🧪 Testing Date Extraction Optimization (Phase 7)\n');
    const now = new Date();
    console.log(`Current Date Context: ${now.toISOString()}\n`);

    for (const test of testCases) {
        const result = extractDates(test.text);
        const passFrom = result.from === test.expected.from;
        const passUntil = result.until === test.expected.until;

        console.log(`Text: "${test.text}"`);
        console.log(`Result:   From: ${result.from}, Until: ${result.until}`);
        console.log(`Expected: From: ${test.expected.from}, Until: ${test.expected.until}`);
        console.log(passFrom && passUntil ? '✅ PASS' : '❌ FAIL');
        console.log('---');
    }
}

runTests();
