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
    valid_cards?: string[]; // New
    join_method?: string | null; // New
}

// ... existing code ...

const MONTHS: Record<string, string> = {
    'ocak': '01', 'şubat': '02', 'mart': '03', 'nisan': '04', 'mayıs': '05', 'haziran': '06',
    'temmuz': '07', 'ağustos': '08', 'eylül': '09', 'ekim': '10', 'kasım': '11', 'aralık': '12'
};

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
 * Main extractor function
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

    // Attempt to isolate just the "description" part if possible
    const possibleCleanSelectors = ['.campaign-text', '.content-body', '.description', 'h2, p, li'];
    let cleanTextMatches: string[] = [];
    $$(possibleCleanSelectors.join(',')).each((_, el) => {
        cleanTextMatches.push($$(el).text());
    });

    const cleanText = cleanTextMatches.join(' ').replace(/\s+/g, ' ').trim() || $$.text().replace(/\s+/g, ' ').trim();

    // Use cleaned HTML for description if available, otherwise plain text.
    const descriptionHtml = $$.html().trim();

    const dates = extractDates(cleanText);
    const min_spend = extractMinSpend(cleanText);
    const earning = extractEarning(title, cleanText);
    const discount = extractDiscount(title, cleanText);
    const valid_cards = extractValidCards(cleanText);
    const join_method = extractJoinMethod(cleanText);

    const localBrands = [...masterBrands];
    // Add missing big brands if needed (as objects)
    const brandNames = localBrands.map(b => b.name.toLowerCase());
    if (!brandNames.includes('vatan bilgisayar')) localBrands.push({ name: 'Vatan Bilgisayar' });
    if (!brandNames.includes('teknosa')) localBrands.push({ name: 'Teknosa' });

    // Fetch dynamic sectors from cache/database
    const dynamicSectors = await getSectorsWithKeywords();
    const classification = extractClassification(title, cleanText, localBrands, dynamicSectors);

    return {
        valid_from: dates.from,
        valid_until: dates.until,
        min_spend,
        earning,
        discount,
        brand: classification.brand,
        sector_slug: classification.sector_slug,
        category: classification.category,
        description: descriptionHtml || cleanText,
        valid_cards,
        join_method
    };
}

/**
 * Converts Turkish date strings (e.g., "31 Aralık 2025" or "31.12.2025") to ISO (2025-12-31)
 */
function parseTurkishDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim().replace(/[.,/]/g, ' ').replace(/\s+/g, ' ');
    const parts = cleanStr.toLowerCase().split(' ');

    let day = '', month = '', year = '';

    if (parts.length === 3) {
        // Format: 31 Aralık 2025 or 31 12 2025
        day = parts[0].padStart(2, '0');
        const monthPart = parts[1];
        year = parts[2];

        // Check if month is numeric
        if (/^\d{1,2}$/.test(monthPart)) {
            month = monthPart.padStart(2, '0');
        } else {
            // Text month
            month = MONTHS[monthPart];
        }
    } else {
        return null;
    }

    if (!month || isNaN(parseInt(day)) || isNaN(parseInt(year))) return null;

    // Validate ranges
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (dayNum < 1 || dayNum > 31) return null;
    if (monthNum < 1 || monthNum > 12) return null;
    if (yearNum < 2000 || yearNum > 2100) return null;

    return `${year} -${month} -${day} `;
}

/**
 * Extracts dates from text
 */
export function extractDates(text: string): { from: string | null, until: string | null } {
    const textDateRegex = /\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\d{4}/gi;
    const numericDateRegex = /\d{1,2}[./]\d{1,2}[./]\d{4}/g;

    let matches: { date: string, index: number }[] = [];

    let m;
    while ((m = textDateRegex.exec(text)) !== null) {
        matches.push({ date: m[0], index: m.index });
    }
    while ((m = numericDateRegex.exec(text)) !== null) {
        matches.push({ date: m[0], index: m.index });
    }

    if (matches.length > 0) {
        // Filter out dates that look like reward usage expiration
        // "Points can be used until..."
        // Look at context around the date (e.g. 50 chars before)
        const validDates = matches.filter(match => {
            const start = Math.max(0, match.index - 70);
            const end = Math.min(text.length, match.index + 60); // Suffix verbs like 'kullanılabilir' are far ahead
            const context = text.substring(start, end).toLowerCase();

            // Exclude if context contains reward keywords indicating "usage period"
            if (context.includes('puan') || context.includes('chip') || context.includes('indirim') || context.includes('kullanılabilir') || context.includes('silinir') || context.includes('geri alınır')) {
                // ...BUT allow if it says "Campaign ... valid until X" despite mentioning points?
                // Risk: "Earn points until X" -> X is campaign end. "Use points until Y" -> Y is usage.

                // Strong signal for Usage Date: "kullanılabilir", "silinir", "harcanabilir"
                if (context.includes('kullanılabilir') || context.includes('silinir') || context.includes('harcanabilir')) {
                    return false;
                }
            }
            return true;
        }).map(m => parseTurkishDate(m.date)).filter(Boolean) as string[];

        if (validDates.length > 0) {
            validDates.sort((a, b) => a.localeCompare(b));
            return {
                from: validDates.length > 1 ? validDates[0] : null,
                until: validDates[validDates.length - 1]
            };
        }
    }
    return { from: null, until: null };
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

        // Title matches get 5x weight
        for (const kw of (sector.keywords || [])) {
            const matches = titleLower.match(new RegExp(kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
            if (matches) score += matches.length * 5;
        }

        // Content matches (first 1000 chars only) get 1x weight
        const contentSnippet = contentLower.substring(0, 1000);
        for (const kw of (sector.keywords || [])) {
            const matches = contentSnippet.match(new RegExp(kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
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
