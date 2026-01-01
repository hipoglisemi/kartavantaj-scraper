const text = "1-31 Ocak 2026 tarihleri arasında yurt içinde tek seferde yapılacak 2.000 TL ve üzeri her kozmetik ve kişisel bakım harcamasına 100 TL, toplam 500 TL ParafPara verilecektir.";

// Test regex patterns from geminiParser
const aylar: Record<string, string> = {
    'ocak':'01','şubat':'02','mart':'03','nisan':'04','mayıs':'05','haziran':'06',
    'temmuz':'07','ağustos':'08','eylül':'09','ekim':'10','kasım':'11','aralık':'12'
};

const t_low = text.toLowerCase().replace('İ', 'i').replace('I', 'ı');

// Pattern 1: Full range with year
const m_full = t_low.match(/(\d{1,2})\s+([a-zğüşıöç]+)\s+(\d{4})\s*[-–]\s*(\d{1,2})\s+([a-zğüşıöç]+)\s+(\d{4})/);
console.log('Pattern 1 (full range):', m_full);

// Pattern 2: Range within same month
const m_range = t_low.match(/(\d{1,2})\s*-\s*(\d{1,2})\s*([a-zğüşıöç]+)\s*(\d{4})/);
console.log('Pattern 2 (same month):', m_range);

if (m_range) {
    const [_, g1, g2, ay, yil] = m_range;
    const valid_from = `${yil}-${aylar[ay]}-${g1.padStart(2, '0')}T00:00:00Z`;
    const valid_until = `${yil}-${aylar[ay]}-${g2.padStart(2, '0')}T23:59:59Z`;
    console.log('Extracted dates:', { valid_from, valid_until });
}
