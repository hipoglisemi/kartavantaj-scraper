import { extractDates } from './src/utils/dataExtractor';

const testCases = [
    "31 Aralık 2025'e kadar geçerlidir",
    "Son gün: 31.12.2025 tarihidir.",
    "Kampanya 1-31 Aralık 2025 tarihleri arasındadır.",
    "Kampanya 01/01/2026 tarihine kadar...",
    "31 Aralık 2025&rsquo;e kadar (HTML entity)",
    "31 Aralık 2025, saat 23:59"
];

console.log('🧪 Testing Date Extraction Regex...\n');

testCases.forEach(text => {
    const result = extractDates(text);
    console.log(`📝 Input: "${text}"`);
    console.log(`   ✅ Result:`, result);
    console.log('---');
});
