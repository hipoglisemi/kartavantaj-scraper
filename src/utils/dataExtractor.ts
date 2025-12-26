// src/utils/dataExtractor.ts
import * as cheerio from 'cheerio';
import { getSectorsWithKeywords } from './sectorCache';

interface ExtractedData {
    valid_from?: string | null;
    valid_until?: string | null;
    min_spend?: number;
    earning?: string | null;
    discount?: string | null;
    brand?: string | null;
    sector_slug?: string | null;
    category?: string | null;
    description?: string | null;
    valid_cards?: string[];
    join_method?: string | null;
    date_flags?: string[]; // Added Phase 7.5
    ai_suggested_valid_until?: string | null; // Added Phase 7.5
}

// ... existing code ...

const MONTHS: Record<string, string> = {
    'ocak': '01', 'şubat': '02', 'mart': '03', 'nisan': '04', 'mayıs': '05', 'haziran': '06',
    'temmuz': '07', 'ağustos': '08', 'eylül': '09', 'ekim': '10', 'kasım': '11', 'aralık': '12'
};

/**
 * Normalizes Turkish text by stripping common suffixes (Phase 7.5)
 * Small, safe, and doesn't use fuzzy matching.
 */
export function normalizeTurkishText(text: string): string {
    if (!text) return '';
    // Basic cleaning and lowercasing
    // Replace Turkish İ with i and I with ı to handle case correctly
    let normalized = text
        .replace(/İ/g, 'i').replace(/I/g, 'ı')
        .toLowerCase()
        .replace(/['’]/g, ' ')
        .replace(/[.,:;!?]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const tokens = normalized.split(' ');
    const cleanedTokens = tokens.map(token => {
        // Only strip if word is long enough to avoid stripping roots
        if (token.length <= 4) return token;

        // Controlled suffixes: -de/da, -den/dan, -in/ın/un/ün, -ler/lar, -li/lı/lu/lü
        return token
            .replace(/(?:lar|ler|dan|den|tan|ten|da|de|ta|te|ın|in|un|ün)$/i, '')
            .replace(/(?:li|lı|lu|lü)$/i, '');
    });

    return cleanedTokens.join(' ');
}

const SECTORS = [
    { slug: 'market-gida', name: 'Market & Gıda', keywords: ['migros', 'carrefoursa', 'şok market', 'a101', 'bim', 'getir', 'yemeksepeti market', 'kasap', 'şarküteri', 'fırın'] },
    { slug: 'akaryakit', name: 'Akaryakıt', keywords: ['shell', 'opet', 'bp', 'petrol ofisi', 'totalenergies', 'akaryakıt', 'benzin', 'motorin', 'lpg', 'istasyon'] },
    { slug: 'giyim-aksesuar', name: 'Giyim & Aksesuar', keywords: ['boyner', 'zara', 'h&m', 'mango', 'lcw', 'koton', 'giyim', 'ayakkabı', 'çanta', 'moda', 'aksesuar', 'takı', 'saat'] },
    { slug: 'restoran-kafe', name: 'Restoran & Kafe', keywords: ['restoran', 'yemeksepeti', 'getir yemek', 'starbucks', 'kahve', 'cafe', 'kafe', 'burger king', 'mcdonalds', 'fast food'] },
    { slug: 'elektronik', name: 'Elektronik', keywords: ['teknosa', 'vatan bilgisayar', 'media markt', 'apple', 'samsung', 'elektronik', 'beyaz eşya', 'telefon', 'bilgisayar', 'tablet', 'laptop', 'televizyon', 'klima', 'beyaz eşya'] },
    { slug: 'mobilya-dekorasyon', name: 'Mobilya & Dekorasyon', keywords: ['ikea', 'koçtaş', 'bauhaus', 'mobilya', 'dekorasyon', 'ev tekstili', 'yatak', 'mutfak', 'halı', 'iklimlendirme'] },
    { slug: 'kozmetik-saglik', name: 'Kozmetik & Sağlık', keywords: ['gratis', 'watsons', 'rossmann', 'sephora', 'kozmetik', 'kişisel bakım', 'eczane', 'sağlık', 'hastane', 'doktor', 'parfüm'] },
    { slug: 'e-ticaret', name: 'E-Ticaret', keywords: ['trendyol', 'hepsiburada', 'amazon', 'n11', 'pazarama', 'çiçeksepeti', 'e-ticaret', 'online alışveriş'] },
    { slug: 'ulasim', name: 'Ulaşım', keywords: ['thy', 'pegasus', 'türk hava yolları', 'havayolu', 'otobüs', 'ulaşım', 'araç kiralama', 'rent a car', 'martı', 'bitaksi', 'uber'] },
    { slug: 'dijital-platform', name: 'Dijital Platform', keywords: ['netflix', 'spotify', 'youtube premium', 'exxen', 'disney+', 'steam', 'playstation', 'xbox', 'dijital platform', 'oyun'] },
    { slug: 'kultur-sanat', name: 'Kültür & Sanat', keywords: ['sinema', 'tiyatro', 'konser', 'biletix', 'itunes', 'kitap', 'etkinlik', 'müze', 'sanat'] },
    { slug: 'egitim', name: 'Eğitim', keywords: ['okul', 'üniversite', 'kırtasiye', 'kurs', 'eğitim', 'öğrenim'] },
    { slug: 'sigorta', name: 'Sigorta', keywords: ['sigorta', 'kasko', 'poliçe', 'emeklilik'] },
    { slug: 'otomotiv', name: 'Otomotiv', keywords: ['otomotiv', 'servis', 'bakım', 'yedek parça', 'lastik', 'oto'] },
    { slug: 'vergi-kamu', name: 'Vergi & Kamu', keywords: ['vergi', 'mtv', 'belediye', 'e-devlet', 'kamu', 'fatura'] },
    { slug: 'turizm-konaklama', name: 'Turizm & Konaklama', keywords: ['otel', 'tatil', 'konaklama', 'turizm', 'acente', 'jolly tur', 'etstur', 'setur', 'yurt dışı', 'seyahat'] }
];

/**
 * Main extractor function (Phase 7.5)
 */
export async function extractDirectly(
    html: string,
    title: string,
    masterBrands: Array<{ name: string, sector_id?: number }> = []
): Promise<ExtractedData> {
    const $ = cheerio.load(html);

    // Target common content area selectors to avoid noise
    const contentSelectors = ['.cmsContent', '.campaingDetail', 'main', 'article'];
    let targetHtml = '';
    for (const sel of contentSelectors) {
        const found = $(sel);
        if (found.length > 0) {
            targetHtml = found.html() || '';
            break;
        }
    }
    if (!targetHtml) targetHtml = $.html();

    const $$ = cheerio.load(targetHtml);
    $$('script, style, iframe, nav, footer, header, .footer, .header, .sidebar, #header, #footer').remove();

    // Isolated content
    const possibleCleanSelectors = ['.campaign-text', '.content-body', '.description', 'h2, p, li'];
    let cleanTextMatches: string[] = [];
    $$(possibleCleanSelectors.join(',')).each((_, el) => {
        cleanTextMatches.push($$(el).text());
    });

    const cleanText = cleanTextMatches.join(' ').replace(/\s+/g, ' ').trim() || $$.text().replace(/\s+/g, ' ').trim();
    const normalizedText = normalizeTurkishText(cleanText);

    // 1. Date Extraction (Phase 7.5 - parseDates)
    const dates = parseDates(cleanText);

    // 2. Extractions
    const min_spend = extractMinSpend(cleanText);
    const earning = extractEarning(title, cleanText);
    const discount = extractDiscount(title, cleanText);
    const valid_cards = extractValidCards(cleanText);
    const join_method = extractJoinMethod(cleanText);

    // 3. AI Referee Check (Phase 7.5 Specification)
    let ai_suggested_valid_until: string | null = null;
    if (!dates.valid_until) {
        const dateSignals = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık', 'geçerli', 'tarih'];
        const hasSignal = dateSignals.some(s => cleanText.toLowerCase().includes(s));
        if (hasSignal) {
            // Signals for external AI referee logic
        }
    }

    // 4. Classification
    const localBrands = [...masterBrands];
    const brandNames = localBrands.map(b => b.name.toLowerCase());
    if (!brandNames.includes('vatan bilgisayar')) localBrands.push({ name: 'Vatan Bilgisayar' });
    if (!brandNames.includes('teknosa')) localBrands.push({ name: 'Teknosa' });

    const dynamicSectors = await getSectorsWithKeywords();
    // Use normalized text for classification (Phase 7.5 Requirement)
    const classification = extractClassification(title, normalizedText, localBrands, dynamicSectors);

    return {
        valid_from: dates.valid_from,
        valid_until: dates.valid_until,
        date_flags: dates.date_flags,
        min_spend,
        earning,
        discount,
        brand: classification.brand,
        sector_slug: classification.sector_slug,
        category: classification.category,
        description: $$.html().trim() || cleanText,
        valid_cards,
        join_method,
        ai_suggested_valid_until
    };
}

/**
 * Converts Turkish date strings (e.g., "31 Aralık 2025", "31.12.2025" or "31 Aralık") to ISO (2025-12-31)
 */
function parseTurkishDate(dateStr: string, defaultYear?: number): string | null {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim().replace(/[.,/]/g, ' ').replace(/\s+/g, ' ');
    const parts = cleanStr.toLowerCase().split(' ');

    let day = '', month = '', year = '';
    const now = new Date();
    const currentYear = defaultYear || now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (parts.length === 3) {
        day = parts[0].padStart(2, '0');
        const monthPart = parts[1];
        year = parts[2];
        if (/^\d{1,2}$/.test(monthPart)) {
            month = monthPart.padStart(2, '0');
        } else {
            month = MONTHS[monthPart] || '';
        }
    } else if (parts.length === 2) {
        day = parts[0].padStart(2, '0');
        month = MONTHS[parts[1]] || (/^\d{1,2}$/.test(parts[1]) ? parts[1].padStart(2, '0') : '');
        if (!month) return null;

        const monthNum = parseInt(month);
        if (monthNum < currentMonth - 1) {
            year = (currentYear + 1).toString();
        } else {
            year = currentYear.toString();
        }
    } else {
        return null;
    }

    if (!month || !day || !year) return null;
    if (day.length > 2 || year.length !== 4) return null; // Basic validation

    return `${year}-${month}-${day}`;
}

/**
 * Robust Date Parsing (Phase 7.5 Specifications)
 */
export function parseDates(text: string, today: Date = new Date()): {
    valid_from: string | null,
    valid_until: string | null,
    date_flags: string[]
} {
    let valid_from: string | null = null;
    let valid_until: string | null = null;
    let date_flags: string[] = [];

    // Filter out point usage context before parsing
    const normalized = text.replace(/\s+/g, ' ');

    // 1. DD.MM.YYYY - DD.MM.YYYY
    const fullNumericRange = /(\d{1,2})[./](\d{1,2})[./](\d{4})\s*[-–]\s*(\d{1,2})[./](\d{1,2})[./](\d{4})/g;
    let m = fullNumericRange.exec(normalized);
    if (m) {
        valid_from = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        valid_until = `${m[6]}-${m[5].padStart(2, '0')}-${m[4].padStart(2, '0')}`;
        return { valid_from, valid_until, date_flags };
    }

    // 2. DD.MM - DD.MM (Yearless)
    const shortNumericRange = /(\d{1,2})[./](\d{1,2})\s*[-–]\s*(\d{1,2})[./](\d{1,2})/g;
    m = shortNumericRange.exec(normalized);
    if (m) {
        const fromDateObj = parseTurkishDate(`${m[1]}.${m[2]}`, today.getFullYear());
        const untilDateObj = parseTurkishDate(`${m[3]}.${m[4]}`, today.getFullYear());
        if (fromDateObj && untilDateObj) {
            valid_from = fromDateObj;
            valid_until = untilDateObj;
            if (valid_from > valid_until) {
                valid_until = parseTurkishDate(`${m[3]}.${m[4]}`, today.getFullYear() + 1);
            }
            date_flags.push('year_inferred');
            return { valid_from, valid_until, date_flags };
        }
    }

    // 3. 1-31 Ocak (Phase 7 logic but more robust)
    const textRangeRegex = /(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)(?:\s+(\d{4}))?/gi;
    m = textRangeRegex.exec(normalized);
    if (m) {
        const year = m[4] ? parseInt(m[4]) : today.getFullYear();
        const untilStr = `${m[2]} ${m[3]} ${year}`.trim();
        valid_until = parseTurkishDate(untilStr, year);
        if (valid_until) {
            const yearMonth = valid_until.substring(0, 8);
            valid_from = `${yearMonth}${m[1].padStart(2, '0')}`;
            if (!m[4]) date_flags.push('year_inferred');
            return { valid_from, valid_until, date_flags };
        }
    }

    // 4. 1 Ocak’tan 31 Ocak’a kadar (Refined)
    const longTextRangeRegex = /(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s*(?:'dan|'den|'tan|'ten|’dan|’den|’tan|’ten)?\s*(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s*(?:'a|'e|’a|’e)?\s+kadar/gi;
    m = longTextRangeRegex.exec(normalized);
    if (!m) {
        const crossMonthRegex = /(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s*[-–]\s*(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)/gi;
        m = crossMonthRegex.exec(normalized);
    }
    if (m) {
        const fromStr = `${m[1]} ${m[2]}`;
        const untilStr = `${m[3]} ${m[4]}`;
        valid_from = parseTurkishDate(fromStr, today.getFullYear());
        valid_until = parseTurkishDate(untilStr, today.getFullYear());
        if (valid_from && valid_until) {
            if (valid_from > valid_until) {
                valid_until = parseTurkishDate(untilStr, today.getFullYear() + 1);
            }
            date_flags.push('year_inferred');
            return { valid_from, valid_until, date_flags };
        }
    }

    // Fallback: Individual dates with "until" signals
    const untilSignals = ["’a kadar", "a kadar", "e kadar", "son gün", "son tarih", "tarihine kadar"];
    const textDatePat = /(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)(?:\s+(\d{4}))?/gi;
    const numericDatePat = /(\d{1,2})[./](\d{1,2})[./](\d{4})/g;

    let bestUntilMatch: string | null = null;
    let numericM;
    while ((numericM = numericDatePat.exec(normalized)) !== null) {
        const snippet = normalized.substring(Math.max(0, numericM.index - 20), numericM.index + 50).toLowerCase();
        if (untilSignals.some(s => snippet.includes(s))) {
            bestUntilMatch = `${numericM[3]}-${numericM[2].padStart(2, '0')}-${numericM[1].padStart(2, '0')}`;
        }
    }
    if (!bestUntilMatch) {
        let textM;
        while ((textM = textDatePat.exec(normalized)) !== null) {
            const snippet = normalized.substring(Math.max(0, textM.index - 20), textM.index + 50).toLowerCase();
            if (untilSignals.some(s => snippet.includes(s))) {
                const parsed = parseTurkishDate(textM[0], textM[3] ? parseInt(textM[3]) : today.getFullYear());
                if (parsed) {
                    bestUntilMatch = parsed;
                    if (!textM[3]) date_flags.push('year_inferred');
                }
            }
        }
    }

    // Last resort: Month-end heuristic
    if (!bestUntilMatch) {
        const endOfMonthMatch = normalized.match(/(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+sonuna\s+kadar/i);
        if (endOfMonthMatch) {
            const monthNum = MONTHS[endOfMonthMatch[1].toLowerCase()];
            if (monthNum) {
                let year = today.getFullYear();
                if (parseInt(monthNum) < (today.getMonth() + 1) - 1) year++;
                const lastDay = new Date(year, parseInt(monthNum), 0).getDate();
                bestUntilMatch = `${year}-${monthNum.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
                date_flags.push('year_inferred');
            }
        }
    }
    return { valid_from, valid_until: bestUntilMatch, date_flags };
}

/**
 * Extracts min spend amount
 */
export function extractMinSpend(text: string): number {
    // Clean text: remove thousand separators, normalize spaces
    const t = text.replace(/\./g, '').replace(/\s+/g, ' ');

    // 1. Range: "1000 - 2000 TL" -> 1000
    const rangeRegex = /(\d{3,6})\s*-\s*(\d{3,6})\s*TL/i;
    let match = rangeRegex.exec(t);
    if (match) return parseInt(match[1]);

    // 2. "Her 1000 TL..." or "ilk 1000 TL"
    const everyRegex = /(?:Her|ilk)\s+(\d{3,6})\s*TL/i;
    match = everyRegex.exec(t);
    if (match) return parseInt(match[1]);

    // 3. Fallback: "3000 TL ... harcama/alışveriş"
    // EXCLUDE "chip-para", "puan", "indirim" in the interim text to avoid picking up the reward amount
    // `(?: (? !chip - para | puan | indirim).){ 0, 60 } `
    const broadRegex = /(\d{3,6})\s*TL\s+(?:(?!chip-para|puan|indirim).){0,60}?(?:harcama|alışveriş|yükleme|sipariş|ödeme)/i;
    match = broadRegex.exec(t);
    if (match) return parseInt(match[1]);

    // 4. Standard: "2000 TL ve üzeri"
    const standardRegex = /(\d{3,6})\s*TL\s*(?:ve\s+üzeri|tutarında)/i;
    match = standardRegex.exec(t);
    if (match) return parseInt(match[1]);

    return 0;
}

/**
 * Extracts earning/reward info
 */
export function extractEarning(title: string, content: string): string | null {
    // Enhanced regex to catch "250 TL chip-para" or similar
    const rewardRegex = /(\d+[\d.,]*)\s*(?:TL\s*)?(?:chip-para|puan|bonus|indirim|maxipuan|parafpara)/gi;

    // Check title first
    const titleMatch = title.match(rewardRegex);
    if (titleMatch) return titleMatch[0].trim();

    // Check content
    const contentMatch = content.match(rewardRegex);
    if (contentMatch) return contentMatch[0].trim();

    return null;
}

/**
 * Extracts discount/installment info
 */
export function extractDiscount(title: string, content: string): string | null {
    const installmentRegex = /(\d+|\+\d+)\s*(?:aya\s+varan\s+)?taksit/gi;

    const titleMatch = title.match(installmentRegex);
    if (titleMatch) return titleMatch[0].trim();

    const contentMatch = content.match(installmentRegex);
    if (contentMatch) return contentMatch[0].trim();

    return null;
}

export function extractValidCards(text: string): string[] {
    const cards = ['Axess', 'Wings', 'Free', 'Akbank Kart', 'Neo', 'Ticari Kart'];
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    // Check positive statements "Axess ve Wings ile"
    cards.forEach(card => {
        if (lowerText.includes(card.toLowerCase())) {
            // Check for nearby "dahil değildir" negation (heuristic: within next 50 chars)
            // e.g. "Free kartlar kampanyaya dahil değildir"
            const index = lowerText.indexOf(card.toLowerCase());
            const context = lowerText.substring(index, index + 60); // look ahead

            if (!context.includes('dahil değil') && !context.includes('geçerli değil')) {
                found.push(card);
            }
        }
    });
    return found;
}

export function extractJoinMethod(text: string): string | null {
    const lowerText = text.toLowerCase();

    // Priority order matters (specific to generic)
    if (lowerText.includes('juzdan') || lowerText.includes('juzdan ile')) return 'Juzdan ile Katıl';

    if (lowerText.includes('sms') || /kayıt\s+yazıp/.test(lowerText) || /\d{4}'e\s+gönder/.test(lowerText)) return 'SMS ile Katıl';

    if (lowerText.includes('müşteri hizmetleri') || lowerText.includes('çağrı merkezi') || lowerText.includes('444 25 25')) return 'Müşteri Hizmetleri';

    if (lowerText.includes('mobil şube') || lowerText.includes('akbank mobil') || lowerText.includes('mobil uygulama')) return 'Mobil Uygulama';

    if (lowerText.includes('otomatik')) return 'Otomatik Katılım';

    return null;
}

/**
 * Extracts brand and sector using master data hints
 * NEW: Supports brand→sector mapping for AI-free classification
 */
export function extractClassification(
    title: string,
    content: string,
    masterBrands: Array<{ name: string, sector_id?: number }> = [],
    masterSectors: any[] = SECTORS
): { brand: string | null, sector_slug: string | null, category: string | null, method?: string } {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    // 1. Find Brand (Priority: Title Match > early content match)
    let foundBrand: { name: string, sector_id?: number } | null = null;
    const sortedBrands = [...masterBrands].sort((a, b) => b.name.length - a.name.length);

    // Check title first (Strongest signal)
    for (const mb of sortedBrands) {
        if (titleLower.includes(mb.name.toLowerCase())) {
            foundBrand = mb;
            break;
        }
    }

    // Check content if not in title (Limit to start of content to avoid footer ads)
    if (!foundBrand) {
        const contentSnippet = contentLower.substring(0, 3000);
        for (const mb of sortedBrands) {
            if (contentSnippet.includes(mb.name.toLowerCase())) {
                foundBrand = mb;
                break;
            }
        }
    }

    // 2. Brand-Based Sector Classification (NEW - Phase 2)
    if (foundBrand && foundBrand.sector_id) {
        // Brand has direct sector mapping → use it (skip keyword scoring)
        const sector = masterSectors.find(s => s.id === foundBrand.sector_id);
        if (sector) {
            return {
                brand: foundBrand.name,
                sector_slug: sector.slug,
                category: sector.name,
                method: 'brand_mapping' // High confidence
            };
        }
    }

    // 3. Fallback: Find Sector via keywords with scoring
    let foundSectorSlug: string | null = null;
    let foundCategory: string | null = null;

    const sectorScores = masterSectors.map(sector => {
        let score = 0;

        // Use normalized title/content for keywords (Phase 7.5)
        const nTitle = normalizeTurkishText(title);
        // content is already normalized when passed from extractDirectly, but let's be safe
        const nContent = normalizeTurkishText(content);

        // Title matches get 5x weight
        for (const kw of (sector.keywords || [])) {
            const nKw = normalizeTurkishText(kw);
            // Use word boundaries for phrase matching
            const regex = new RegExp(`\\b${nKw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
            const matches = nTitle.match(regex);
            if (matches) score += matches.length * 5;
        }

        // Content matches (first 1000 chars only) get 1x weight
        const contentSnippet = nContent.substring(0, 1000);
        for (const kw of (sector.keywords || [])) {
            const nKw = normalizeTurkishText(kw);
            const regex = new RegExp(`\\b${nKw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
            const matches = contentSnippet.match(regex);
            if (matches) score += matches.length;
        }

        return { ...sector, score };
    });

    const sortedSectors = sectorScores.sort((a, b) => b.score - a.score);
    const topSector = sortedSectors[0];

    if (topSector && topSector.score > 0) {
        foundSectorSlug = topSector.slug;
        foundCategory = topSector.name;
    }

    return {
        brand: foundBrand?.name || null,
        sector_slug: foundSectorSlug || 'diger',
        category: foundCategory || 'Diğer',
        method: 'keyword_scoring'
    };
}
