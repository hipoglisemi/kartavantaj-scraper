import { parseDates, normalizeTurkishText } from './src/utils/dataExtractor';

const testCases = [
    { text: "31 Aralık 2024 tarihine kadar geçerlidir.", expected: { from: null, until: "2024-12-31" } },
    { text: "Kampanya 1-31 Ocak 2025 tarihleri arasında geçerlidir.", expected: { from: "2025-01-01", until: "2025-01-31" } },
    { text: "1 Ocak’tan 30 Ocak’a kadar geçerli.", expected: { from: "2026-01-01", until: "2026-01-30" } }, // Dec 2025 -> Jan 2026
    { text: "15.10 - 15.11 tarihleri arasında", expected: { from: "2026-10-15", until: "2026-11-15" } }, // Dec 2025 context
    { text: "Son gün 31.01.2026", expected: { from: null, until: "2026-01-31" } },
    { text: "15 Aralık - 15 Ocak arası", expected: { from: "2025-12-15", until: "2026-01-15" } }, // Crossing year
    { text: "Ocak sonuna kadar geçerlidir.", expected: { from: null, until: "2026-01-31" } }
];

const normalizationTests = [
    { input: "Migros'ta indirimler", expected: "migros indirim" },
    { input: "İstanbul'un havası", expected: "istanbul hava" },
    { input: "Marketlerden aldım", expected: "market aldım" },
    { input: "Akaryakıtçı", expected: "akaryakıt" }
];

async function runTests() {
    console.log('🧪 Testing Date Extraction Optimization (Phase 7.5)\n');
    const now = new Date();
    console.log(`Current Date Context: ${now.toISOString()}\n`);

    console.log('--- DATE TESTS ---');
    for (const test of testCases) {
        const result = parseDates(test.text, now);
        const passFrom = result.valid_from === test.expected.from;
        const passUntil = result.valid_until === test.expected.until;

        console.log(`Text: "${test.text}"`);
        console.log(`Result:   From: ${result.valid_from}, Until: ${result.valid_until}, Flags: [${result.date_flags.join(', ')}]`);
        console.log(`Expected: From: ${test.expected.from}, Until: ${test.expected.until}`);
        console.log(passFrom && passUntil ? '✅ PASS' : '❌ FAIL');
        console.log('---');
    }

    console.log('\n--- NORMALIZATION TESTS ---');
    for (const test of normalizationTests) {
        const result = normalizeTurkishText(test.input);
        const pass = result.includes(test.expected);
        console.log(`Input: "${test.input}" -> Result: "${result}" (Expected to contain: "${test.expected}")`);
        console.log(pass ? '✅ PASS' : '❌ FAIL');
        console.log('---');
    }
}

runTests();
