const text = "Axess'e özel ADV Mağazalarında 1 Ocak - 31 Aralık 2026 tarihleri arasında 6 aya varan taksit!";

// Test date regex
const match = text.match(/(\d{1,2})\s+([A-Za-zğüşıöçĞÜŞİÖÇ]+)\s*[-–]\s*(\d{1,2})\s+([A-Za-zğüşıöçĞÜŞİÖÇ]+)\s+(\d{4})/i);
console.log('Date match:', match);

if (match) {
    const [_, d1, m1, d2, m2, year] = match;
    console.log('Extracted:', { d1, m1, d2, m2, year });
    console.log('valid_until should be:', `${year}-12-${d2.padStart(2, '0')}`);
}
