import * as dotenv from 'dotenv';
import { generateSectorSlug, generateCampaignSlug } from '../utils/slugify';
import { syncEarningAndDiscount } from '../utils/dataFixer';
import { supabase } from '../utils/supabase';
import { cleanCampaignText } from '../utils/textCleaner';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_KEY!;

// Smart Hybrid: Two models for optimal performance
const FLASH_MODEL = 'gemini-2.0-flash';
const THINKING_MODEL = 'gemini-2.0-flash'; // Standardized to Flash since Thinking is unavailable

const CRITICAL_FIELDS = ['valid_until', 'eligible_customers', 'min_spend', 'category', 'bank', 'earning'];

interface MasterData {
    categories: string[];
    brands: string[];
    banks: string[];
}

let cachedMasterData: MasterData | null = null;

async function fetchMasterData(): Promise<MasterData> {
    if (cachedMasterData) return cachedMasterData;

    console.log('📚 Supabase\'den ana veriler çekiliyor...');

    const [sectorsRes, brandsRes] = await Promise.all([
        supabase.from('master_sectors').select('name'),
        supabase.from('master_brands').select('name')
    ]);

    // Use master_sectors (same as frontend) instead of master_categories
    const categories = sectorsRes.data?.map(c => c.name) || [
        'Market & Gıda', 'Akaryakıt', 'Giyim & Aksesuar', 'Restoran & Kafe',
        'Elektronik', 'Mobilya & Dekorasyon', 'Kozmetik & Sağlık', 'E-Ticaret',
        'Ulaşım', 'Dijital Platform', 'Kültür & Sanat', 'Eğitim',
        'Sigorta', 'Otomotiv', 'Vergi & Kamu', 'Turizm & Konaklama', 'Diğer'
    ];

    const brands = brandsRes.data?.map(b => b.name) || [];

    const banks = [
        'Yapı Kredi',
        'Garanti BBVA',
        'İş Bankası',
        'Akbank',
        'QNB Finansbank',
        'Ziraat',
        'Halkbank',
        'Vakıfbank',
        'Denizbank',
        'TEB',
        'ING',
        'Diğer'
    ];

    cachedMasterData = { categories, brands, banks };
    console.log(`✅ Veriler Yüklendi: ${categories.length} kategori, ${brands.length} marka, ${banks.length} banka`);

    return cachedMasterData;
}

// Rate limiting: Track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000; // Minimum 1 second between requests (unlimited RPM with 2.5-flash)

// Sleep utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Smart Hybrid: Detect if campaign needs Thinking model
 * Returns true for complex campaigns requiring advanced reasoning
 */
function shouldUseThinking(campaignText: string): boolean {
    const text = campaignText.toLowerCase();

    // 1. Mathematical complexity
    if (/her\s+\d+.*?tl.*?(toplam|toplamda)/i.test(text)) return true;  // Tiered: "Her X TL'ye Y TL, toplam Z"
    if (/\d+\s*tl\s*-\s*\d+\s*tl.*?(%|indirim|puan)/i.test(text)) return true;  // Range + percentage
    if (/(\d+)\s+(farklı\s+gün|farklı\s+işlem|işlem).*?toplam/i.test(text)) return true;  // Multi-transaction

    // 2. Complex participation
    if (/\s+(ve|veya)\s+(sms|juzdan|jüzdan|uygulama)/i.test(text)) return true;  // Multiple methods
    if (/harcamadan\s+önce.*?(katıl|sms)/i.test(text)) return true;  // Constraints
    if (/\d{4}.*?(sms|mesaj).*?\w+/i.test(text)) return true;  // SMS with keyword

    // 3. Card logic complexity
    if (/(hariç|geçerli\s+değil|dahil\s+değil)/i.test(text)) return true;  // Exclusions
    if (/(ticari|business|kobi).*?(kart|card)/i.test(text)) return true;  // Business cards
    if (/(platinum|gold|classic).*?(ve|veya|hariç)/i.test(text)) return true;  // Card variants

    // 4. Conflicting information
    if (/son\s+(katılım|gün|tarih).*?\d{1,2}\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)/i.test(text)) return true;  // Date conflicts

    return false;
}

async function callGeminiAPI(prompt: string, modelName: string = FLASH_MODEL, retryCount = 0): Promise<any> {
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 2000;

    try {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
            const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
            console.log(`   ⏳ Hız sınırlama: ${waitTime}ms bekleniyor...`);
            await sleep(waitTime);
        }
        lastRequestTime = Date.now();

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    // Python Code Execution enabled by default for all geminiParser calls
                    tools: [{ code_execution: {} }],
                    generationConfig: {
                        temperature: 0.1
                    }
                })
            }
        );

        if (response.status === 429) {
            if (retryCount >= MAX_RETRIES) {
                throw new Error(`Gemini API rate limit exceeded after ${MAX_RETRIES} retries`);
            }
            const retryDelay = BASE_DELAY_MS * Math.pow(2, retryCount);
            console.log(`   ⚠️  Hız limitine takıldı (429). Deneme ${retryCount + 1}/${MAX_RETRIES}, ${retryDelay}ms sonra...`);
            await sleep(retryDelay);
            return callGeminiAPI(prompt, modelName, retryCount + 1);
        }

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
        }

        const data: any = await response.json();
        const usage = data.usageMetadata;
        if (usage) {
            console.log(`   📊 AI Usage: ${usage.totalTokenCount} tokens (P: ${usage.promptTokenCount}, C: ${usage.candidatesTokenCount})`);
        }

        const candidates = data.candidates?.[0]?.content?.parts || [];
        if (candidates.length === 0) throw new Error('No candidates from Gemini');

        // Robust Multi-part Extraction: Check text parts AND code results
        for (const part of candidates) {
            // Priority 1: Text part containing JSON
            if (part.text && part.text.includes('{')) {
                const jsonMatch = part.text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try { return JSON.parse(jsonMatch[0]); } catch (e) { /* ignore and continue */ }
                }
            }
            // Priority 2: Code Execution Result containing JSON
            if (part.codeExecutionResult && part.codeExecutionResult.output) {
                const jsonMatch = part.codeExecutionResult.output.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try { return JSON.parse(jsonMatch[0]); } catch (e) { /* ignore and continue */ }
                }
            }
        }

        throw new Error(`AI returned but no valid JSON object was found in multi-part response.`);
    } catch (error: any) {
        const is404 = error.message.includes('404') || error.message.includes('not found');
        if (retryCount < MAX_RETRIES && !error.message.includes('rate limit') && !is404) {
            const retryDelay = BASE_DELAY_MS * Math.pow(2, retryCount);
            console.log(`   ⚠️  Error: ${error.message}. Retry ${retryCount + 1}/${MAX_RETRIES} after ${retryDelay}ms...`);
            await sleep(retryDelay);
            return callGeminiAPI(prompt, modelName, retryCount + 1);
        }
        throw error;
    }
}

function checkMissingFields(data: any): string[] {
    const missing: string[] = [];

    CRITICAL_FIELDS.forEach(field => {
        const value = data[field];

        // For numeric fields (min_spend, max_discount, discount_percentage),
        // 0 is a valid value. Only null/undefined means missing.
        if (field === 'min_spend') {
            if (value === null || value === undefined) {
                missing.push(field);
            }
        }
        // For other fields, check for empty/falsy values
        else if (!value ||
            (Array.isArray(value) && value.length === 0) ||
            value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim() === '')) {
            missing.push(field);
        }
    });

    return missing;
}

/**
 * Stage 3: Surgical Correction
 * Focuses ONLY on specific missing fields to save tokens and improve accuracy.
 */
export async function parseSurgical(
    html: string,
    existingData: any,
    missingFields: string[],
    url: string,
    sourceBank?: string
): Promise<any> {
    const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000);

    const masterData = await fetchMasterData();

    console.log(`   🤖 Surgical Parse: Filling ${missingFields.join(', ')}...`);

    const surgicalPrompt = `
You are a precision data extraction tool. We have an existing campaign entry, but it's missing specific info.
DO NOT guess other fields. ONLY extract the fields requested.
🚨 MATHEMATICAL ACCURACY: Use the Python code execution tool to verify all spend limits, bonus ratios, and cumulative totals before returning the JSON.

EXISTING DATA (for context):
Title: ${existingData.title}
Current Category: ${existingData.category}

MISSING FIELDS TO EXTRACT:
${missingFields.map(f => `- ${f}`).join('\n')}

FIELD DEFINITIONS:
- valid_until: YYYY-MM-DD
- eligible_customers: Array of strings
- min_spend: Number
- earning: String (e.g. "500 TL Puan"). CRITICAL: DO NOT return null. If no numeric reward, summarize the main benefit in 2-3 words (e.g., "Uçak Bileti Fırsatı", "3 Taksit Ayrıcalığı", "Özel İndirim").
- category: MUST be one of [${masterData.categories.join(', ')}]
- bank: MUST be one of [${masterData.banks.join(', ')}]
- brand: ARRAY of brand names mentioned. E.g. ["Burger King", "Migros"]. Match to: ${masterData.brands.slice(0, 100).join(', ')}

TEXT TO SEARCH:
"${text.replace(/"/g, '\\"')}"

RETURN ONLY VALID JSON. NO MARKDOWN.
`;

    const surgicalData = await callGeminiAPI(surgicalPrompt);

    // Merge and Clean
    const result = { ...existingData, ...surgicalData };
    const title = result.title || '';
    const description = result.description || '';

    // STAGE 3: Bank Service Detection & "Genel" logic
    // Refined: Only identify as bank service if it's strictly banking and lacks merchant markers.
    const isBankService = /ekstre|nakit avans|kredi kartı başvurusu|limit artış|borç transferi|borç erteleme|başvuru|otomatik ödeme|kira|harç|bağış/i.test(title + ' ' + description);

    // STAGE 4: Historical Assignment Lookup
    const { data: pastCampaign } = await supabase
        .from('campaigns')
        .select('brand, category')
        .eq('title', title)
        .not('brand', 'is', null)
        .not('brand', 'eq', '')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Strict Brand Cleanup
    const brandCleaned = await cleanupBrands(result.brand, masterData);
    result.brand = brandCleaned.brand;
    result.brand_suggestion = brandCleaned.suggestion;

    if (isBankService) {
        console.log(`   🏦 Bank service detected for "${title}", mapping to "Genel"`);
        result.brand = 'Genel';
        result.brand_suggestion = '';
    } else if (pastCampaign) {
        console.log(`   🧠 Learning: Previously mapped to brand "${pastCampaign.brand}" for "${title}"`);
        result.brand = pastCampaign.brand;
        result.brand_suggestion = '';
        result.category = pastCampaign.category || result.category;
    }

    // Ensure category -> sector_slug consistency
    if (result.category) {
        result.sector_slug = generateSectorSlug(result.category);
    }

    return result;
}

/**
 * Standardizes brand names (Sync with frontend metadataService)
 */
function normalizeBrandName(name: string): string {
    if (!name) return '';

    // 1. Remove common domain extensions and noise suffixes
    let cleanName = name
        .replace(/\.com\.tr|\.com|\.net|\.org/gi, '')
        .replace(/\s+notebook$|\s+market$|\s+marketleri$/gi, '')
        .trim();

    // 2. Specialized Merges (Canonical Mapping)
    const lower = cleanName.toLowerCase();
    if (lower === 'monsternotebook') return 'Monster';
    if (lower === 'mediamarkt') return 'Media Markt';
    if (lower === 'trendyolmilla') return 'TrendyolMilla';
    if (lower === 'hepsiburada') return 'Hepsiburada';
    if (lower === 'n11') return 'n11';

    // 3. Title Case with Turkish support
    return cleanName.split(' ').map(word => {
        if (word.length === 0) return '';
        return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR');
    }).join(' ').trim();
}

/**
 * Normalizes and cleans brand data to ensure it's a flat string and matches master data.
 * Automatically adds new brands to master_brands if they are valid and not existing.
 */
async function cleanupBrands(brandInput: any, masterData: MasterData): Promise<{ brand: string, suggestion: string }> {
    let brands: string[] = [];

    // 1. Normalize input to array
    if (Array.isArray(brandInput)) {
        brands = brandInput.map(b => String(b));
    } else if (typeof brandInput === 'string') {
        const cleaned = brandInput.replace(/[\[\]"]/g, '').trim();
        if (cleaned.includes(',')) {
            brands = cleaned.split(',').map(b => b.trim());
        } else if (cleaned) {
            brands = [cleaned];
        }
    }

    if (brands.length === 0) return { brand: '', suggestion: '' };

    const forbiddenTerms = [
        'yapı kredi', 'world', 'worldcard', 'worldpuan', 'puan', 'taksit', 'indirim',
        'kampanya', 'fırsat', 'troy', 'visa', 'mastercard', 'express', 'bonus', 'maximum',
        'axess', 'bankkart', 'paraf', 'card', 'kredi kartı', 'nakit', 'chippin', 'adios', 'play',
        'wings', 'free', 'wings card', 'black', 'mil', 'chip-para', 'puan',
        ...masterData.banks.map(b => b.toLowerCase())
    ];

    const matched: string[] = [];
    const unmatched: string[] = [];

    for (const b of brands) {
        const lower = b.trim().toLowerCase();
        if (!lower || lower.length <= 1) continue;
        if (lower === 'yok' || lower === 'null' || lower === 'genel') continue;
        if (forbiddenTerms.some(term => lower === term || lower.startsWith(term + ' '))) continue;

        const match = masterData.brands.find(mb => mb.toLowerCase() === lower);
        if (match) {
            matched.push(match);
        } else {
            // New brand found!
            const normalized = normalizeBrandName(b);
            if (normalized && normalized.length > 1) {
                unmatched.push(normalized);
            }
        }
    }

    // Process new brands: Add to DB if they don't exist
    if (unmatched.length > 0) {
        console.log(`   🆕 New brands detected: ${unmatched.join(', ')}`);
        for (const newBrand of unmatched) {
            try {
                // Double check if it exists in DB (case insensitive)
                const { data: existing } = await supabase
                    .from('master_brands')
                    .select('name')
                    .ilike('name', newBrand)
                    .single();

                if (!existing) {
                    const { error } = await supabase
                        .from('master_brands')
                        .insert([{ name: newBrand }]);

                    if (!error) {
                        console.log(`   ✅ Added new brand: ${newBrand}`);
                        matched.push(newBrand);
                        // Update cache to include this new brand for future matches in this run
                        masterData.brands.push(newBrand);
                    } else {
                        console.error(`   ❌ Error adding brand ${newBrand}:`, error.message);
                    }
                } else {
                    matched.push(existing.name);
                }
            } catch (err) {
                console.error(`   ❌ Failed to process brand ${newBrand}`);
            }
        }
    }

    return {
        brand: [...new Set(matched)].join(', '),
        suggestion: '' // Suggestions are now automatically added to matched if verified/added
    };
}

export async function parseWithGemini(html: string, url: string, sourceBank?: string, sourceCard?: string): Promise<any> {
    // Intelligent HTML to Clean Text conversion
    const rawText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove styles
        .replace(/<(?:br|p|div|li|h1|h2|h3|h4|h5|h6)[^>]*>/gi, '\n')       // Block elements to newlines
        .replace(/<[^>]+>/g, ' ')                                           // Remove other tags
        .replace(/[ \t]+/g, ' ')                                            // Standardize horizontal spaces
        .replace(/\n\s*\n/g, '\n')                                          // Remove double newlines
        .trim();

    // Clean junk banking legal text to save tokens
    const text = cleanCampaignText(rawText)
        .substring(0, 12000); // 12k chars is enough for most campaigns after cleaning

    const masterData = await fetchMasterData();

    // Sort everything to ensure perfectly STABLE prefix for Caching
    const sortedCategories = [...masterData.categories].sort().join(', ');
    const sortedBanks = [...masterData.banks].sort().join(', ');
    const sortedBrands = [...masterData.brands].sort((a, b) => a.localeCompare(b, 'tr')).slice(0, 300).join(', ');

    const today = new Date().toISOString().split('T')[0];
    // STAGE 1: Full Parse
    const staticPrefix = `
Extract campaign data into JSON matching this EXACT schema.
🚨 MATHEMATICAL ACCURACY: You MUST use the Python code execution tool to calculate and verify all mathematical logic (min_spend, max_discount, tiered bonuses, etc.) before providing the final JSON output. This ensures 100% accuracy.

{
  "title": "string (catchy campaign title, clear and concise)",
  "description": "string (Short, exciting, marketing-style summary. Max 2 sentences. Use 1-2 relevant emojis. Language: Turkish. Do NOT include boring legal terms.)",
  "conditions": ["string (List of important campaign terms, limits, and exclusions. Extract key rules as separate items.)"],
  "category": "string (MUST be one of: ${sortedCategories})",
  "discount": "string (Use ONLY for installment info, e.g. '9 Taksit', '+3 Taksit'. FORMAT: '{Number} Taksit'. NEVER mention fees/interest.)",
  "earning": "string (🚨 ASLA BOŞ BIRAKMA! Reward info. PRIORITY: '{Amount} TL Puan' | '{Amount} TL İndirim' | '%{X} (max {Y}TL)' for percentage campaigns with limits | '%{X} İndirim' for unlimited percentage. 🚨 SAYI FORMATI: 1.000 ve üzeri sayılarda NOKTA kullan (örn: '30.000 TL Puan', '15.000 TL İndirim'). 🚨 MİL PUAN: Eğer 'Mil' veya 'Mile' kelimesi varsa 'Mil Puan' yaz, 'TL Puan' değil! IF NO NUMERIC REWARD: Create a 2-3 word benefit summary like 'Uçak Bileti', 'Özel Menü', 'Kargo Bedava', 'Taksit İmkanı', 'Özel Fırsat'. MAX 30 chars. NEVER RETURN NULL, EMPTY STRING, OR UNDEFINED!)",
  "min_spend": number (CRITICAL: Total required spend. If title says '500 TL ve üzeri', min_spend is 500. Total sum if multiple steps. 🚨 ARALIK KURALI: Eğer "1.000 TL - 20.000 TL arası" gibi aralık varsa, min_spend = MİNİMUM değer (1.000), ASLA maksimum değer (20.000) KULLANMA!),
  "min_spend_currency": "string (Currency code: TRY, USD, EUR, GBP. Default: TRY. ONLY change if campaign explicitly mentions foreign currency like 'yurt dışı', 'dolar', 'USD', 'euro')",
  "max_discount": number (Max reward limit per customer/campaign),
  "max_discount_currency": "string (Currency code: TRY, USD, EUR, GBP. Default: TRY. ONLY change if reward is in foreign currency)",
  "earning_currency": "string (Currency code: TRY, USD, EUR, GBP. Default: TRY. Match the currency mentioned in earning)",
  "discount_percentage": number (If % based reward, e.g. 15 for %15),
  "valid_from": "YYYY-MM-DD",
  "valid_from": "YYYY-MM-DD",
  "valid_until": "YYYY-MM-DD",
  "eligible_customers": ["array of strings (Simple card names: Axess, Wings, Business, Free etc. IMPORTANT: ALWAYS include 'TROY' if specifically mentioned for these cards, e.g. 'Axess TROY', 'Akbank Kart TROY')"],
  "eligible_cards_detail": {
    "variants": ["array of strings (ONLY if text mentions: Gold, Platinum, Business, Classic, etc.)"],
    "exclude": ["array of strings (ONLY if text says: X hariç, X geçerli değil)"],
    "notes": "string (ONLY if text has special notes: Ticari kartlar hariç, etc.)"
  } | null,
  "participation_method": "string (TAM KATILIM TALİMATI: SADECE NASIL ve NEREDEN (SMS/Uygulama). Tarih veya Harcama Miktarı GİRMEYİN. 🚨 YASAK: 'Juzdan'ı indirin', 'Uygulamayı yükleyin' gibi genel ifadeler KULLANMA! DOĞRU FORMAT: 'Harcamadan önce Juzdan'dan Hemen Katıl butonuna tıklayın' veya 'MARKET yazıp 4566ya SMS gönderin'. Örn: 'Juzdan uygulamasından Hemen Katıla tıklayın veya MARKET yazıp 4566ya SMS gönderin.')",
  "participation_detail": {
    "sms_to": "string (ONLY if SMS number in text: 4442525, etc.)",
    "sms_keyword": "string (ONLY if keyword in text: KATIL, KAMPANYA, etc.)",
    "wallet_name": "string (ONLY if app name in text: Jüzdan, BonusFlaş, etc.)",
    "instructions": "string (ONLY if detailed steps in text: 1-2 sentences)",
    "constraints": ["array of strings (ONLY if conditions: Harcamadan önce katıl, etc.)"]
  } | null,
  "merchant": "string (Primary shop/brand name)",
  "bank": "string (AUTHORITY: MUST be exactly as provided. Allowed: ${sortedBanks})",
  "card_name": "string (AUTHORITY: MUST be exactly as provided.)",
  "brand": [
    "array of strings (🚨 SADECE GERÇEK MARKA İSİMLERİ! Official brand names. YASAK: Kart isimleri (Axess, Wings, Bonus, Free, Juzdan, World, Play, Crystal), Banka isimleri (Akbank, Yapı Kredi, vb.), Genel terimler. ÖRNEK: ['CarrefourSA'], ['Teknosa'], ['Nespresso']. MAX 3 marka. Her marka max 40 karakter.)"
  ],
  "ai_enhanced": true
}

### 🛑 ULTRA-STRICT RULES:

1. **BANK & CARD AUTHORITY:**
   - Use the provided Bank and Card Name. DO NOT hallucinate.

1.5. **KATEGORİ SEÇİMİ (CATEGORY SELECTION):**
   - 🚨 MERCHANT/BRAND'E GÖRE DOĞRU KATEGORİ SEÇ!
   - Koçtaş, Bauhaus, Karaca, Özdilek, İdaş, Korkmaz → "Mobilya & Dekorasyon"
   - Teknosa, MediaMarkt, Vatan, Apple, Samsung, Vestel, Arçelik, Nespresso, Dyson → "Elektronik"
   - CarrefourSA, Migros, A101, BİM, ŞOK → "Market & Gıda"
   - H&M, Zara, LC Waikiki, Mango, Koton, Nike, Adidas, FLO, Desa → "Giyim & Aksesuar"
   - Enuygun, Tatilsepeti, Pegasus, THY, LoungeMe → "Seyahat"
   - Shell, Opet, BP, Lassa, Pirelli, Vale, Otopark → "Otomotiv"
   - Trendyol, Hepsiburada, Amazon, Pazarama → "E-Ticaret"
   - Yemeksepeti, Getir, Starbucks → "Restoran & Kafe"
   - Sağlık, Hastane, Klinik → "Sağlık"
   - Sigorta → "Sigorta"
   - Vergi → "Vergi & Kamu"
   - DİKKAT: "Diğer" kategorisini SADECE yukarıdakilere uymayan kampanyalar için kullan!
   
2. **HARCAMA-KAZANÇ KURALLARI (MATHEMATIC LOGIC):**
   - discount: SADECE "{N} Taksit" veya "+{N} Taksit"
   - earning: Max 30 karakter. "{AMOUNT} TL Puan" | "{AMOUNT} TL İndirim" | "{AMOUNT} TL İade" | "%{P} (max {Y}TL)" | "%{P} İndirim"
     - 🚨 YÜZDE + MAX LİMİT KURALI: Eğer kampanyada yüzde bazlı kazanç VAR ve max_discount değeri VARSA, earning formatı MUTLAKA "%{P} (max {Y}TL)" olmalı.
       - ÖRNEK: "%10 indirim, maksimum 200 TL" metni → earning: "%10 (max 200TL)", max_discount: 200
       - ÖRNEK: "%5 chip-para, toplam 500 TL'ye kadar" → earning: "%5 (max 500TL)", max_discount: 500
     - 🚨 PUAN vs İNDİRİM AYIRIMI:
       - "Puan", "Chip-Para", "Worldpuan", "Mil" içeriyorsa → "{AMOUNT} TL Puan"
       - "İndirim", "İade", "Cashback" içeriyorsa → "{AMOUNT} TL İndirim"
       - ÖRNEK: "300 TL chip-para" → earning: "300 TL Puan"
       - ÖRNEK: "500 TL indirim" → earning: "500 TL İndirim"
       - DİKKAT: Puan ≠ İndirim! Doğru terimi kullan.
     - 🚨 KATLANAN KAMPANYA - TOPLAM KAZANÇ KURALI:
       - "Her X TL'ye Y TL, toplam Z TL" formatında kampanyalarda:
       - earning: "Z TL Puan" veya "Z TL İndirim" (TOPLAM kazanç, işlem başı Y değil!)
       - max_discount: Z (TOPLAM kazanç)
       - ÖRNEK: "Her 100 TL'ye 20 TL, toplam 100 TL puan" → earning: "100 TL Puan" (20 DEĞİL!)
       - ÖRNEK: "Her 500 TL'ye 50 TL, toplam 300 TL indirim" → earning: "300 TL İndirim" (50 DEĞİL!)
   - min_spend: KESİNLİKLE KAZANCI ELDE ETMEK İÇİN GEREKEN "TOPLAM" HARCAMA.
      - 🚨 YÜZDE KAMPANYALARI İÇİN ZORUNLU HESAPLAMA:
        - Eğer kampanya yüzde bazlı (%X indirim) VE max_discount belirtilmişse:
        - FORMÜL: min_spend = max_discount / (yüzde / 100)
        - ÖRNEK 1: "%10 indirim, maksimum 8.000 TL" → min_spend = 8000 / 0.10 = 80.000 TL
        - ÖRNEK 2: "%20 indirim, max 10.000 TL" → min_spend = 10000 / 0.20 = 50.000 TL
        - ÖRNEK 3: "%15 indirim, toplam 200 TL" → min_spend = 200 / 0.15 = 1.333 TL
        - ⚠️  DİKKAT: Metinde "minimum harcama" belirtilmese BİLE, bu formülü KULLAN!
        - ⚠️  ASLA min_spend: 0 YAZMA (yüzde kampanyalarında 0 mantıksız)!
      - 🚨 ARALIK KURALI (MIN-MAX): 
        - Eğer "1.000 TL - 20.000 TL arası" gibi aralık varsa:
        - min_spend = MİNİMUM değer (1.000)
        - ASLA maksimum değer (20.000) KULLANMA!
        - ÖRNEK: "2.000 TL - 500.000 TL arası 3 taksit" → min_spend: 2000 (500000 DEĞİL!)
      - 🚨 KRİTİK KURAL (KATLANAN HARCAMA): Metinde "her X TL harcamaya Y TL, toplam Z TL" veya "X TL ve üzeri her harcamaya..." kalıbı varsa, SAKIN "X" değerini yazma!
        - FORMÜL: min_spend = (Toplam Kazanç / Sefer Başı Kazanç) * Sefer Başı Harcama
        - ÖRNEK 1: "Her 7.500 TL'ye 750 TL, toplam 3.000 TL" → (3000/750)*7500 = 30.000 TL (7500 DEĞİL!)
        - ÖRNEK 2: "Her 800 TL'ye 40 TL, toplam 120 TL" → (120/40)*800 = 2.400 TL (800 DEĞİL!)
        - ÖRNEK 3: "Her 5.000 TL'ye 750 TL, toplam 1.500 TL" → (1500/750)*5000 = 10.000 TL (5000 DEĞİL!)
        - ÖRNEK 4: "5.000 TL ve üzeri her harcamaya 50 TL, toplam 300 TL" → (300/50)*5000 = 30.000 TL
        - ⚠️  DİKKAT: "Her X TL'ye Y TL" gördüğünde MUTLAKA formülü uygula, sadece X'i yazma!
      - 🚨 ÇOKLU İŞLEM KAMPANYALARI: "3 farklı günde 750 TL", "4 işlemde 100 TL" gibi kampanyalar:
        - FORMÜL: min_spend = İşlem Başı Tutar * İşlem Sayısı
        - ÖRNEK 1: "3 farklı günde 750 TL ve üzeri" → 750 * 3 = 2.250 TL
        - ÖRNEK 2: "4 işlemde 100 TL ve üzeri" → 100 * 4 = 400 TL
      - 🚨 ÖNCELİK KURALI: Eğer kampanyada AYNI ANDA birden fazla pattern varsa:
        - 1. ÖNCELİK: Aralık kuralı ("X TL - Y TL arası") → min_spend = X (minimum değer)
        - 2. ÖNCELİK: Katlanan kampanya ("Her X TL'ye Y TL") → Formülü uygula
        - 3. ÖNCELİK: Yüzde kampanya → Formülü uygula
        - ÖRNEK: "15.000-29.999 TL arası %5 indirim" → min_spend = 15.000 (50.000 DEĞİL!)
      - Örnek (Tek Sefer): "Tek seferde 2.000 TL harcamanıza" → 2000 TL.
      - Örnek (X. Harcama): "İkinci 500 TL harcamaya" → 1000 TL (500+500).
      - ÖNEMLİ: Eğer metinde "Tek seferde en az 500 TL harcama yapmanız gerekir" yazsa BİLE, yukarıdaki hesaplama daha yüksek bir tutar çıkarıyorsa ONU YAZ.
   - max_discount: Kampanyadan kazanılabilecek EN YÜKSEK (TOPLAM) tutar. Eğer "toplamda 500 TL" diyorsa, bu değer 500 olmalı.
   - 🚨 PARA BİRİMİ TESPİTİ (CURRENCY DETECTION):
     - Varsayılan: TRY (Türk Lirası)
     - Eğer kampanya "yurt dışı", "abroad", "foreign", "dolar", "USD", "euro", "EUR" içeriyorsa:
       - min_spend_currency, max_discount_currency, earning_currency alanlarını uygun para birimine çevir
       - ÖRNEK: "Yurt dışı harcamalarınıza 15 USD indirim" → earning_currency: "USD", max_discount_currency: "USD"
       - ÖRNEK: "Duty Free'de %15 indirim" → earning_currency: "USD" (yurt dışı olduğu için)
     - DİKKAT: Para birimi değiştiğinde min_spend hesaplaması da o para biriminde olmalı!

3. **KATILIM ŞEKLİ (participation_method):**
   - **TAM VE NET TALİMAT.** Ne çok kısa ne çok uzun.
   - GEREKSİZ SÖZCÜKLERİ ("Kampanyaya katılmak için", "Harcama yapmadan önce", "tarihlerinde") ATIN.
   - SADECE EYLEMİ DETAYLANDIRIN (Hangi buton? Hangi SMS kodu?).
   - YASAK (Çok Kısa): "Juzdan'dan katılın." (Hangi buton?)
   - YASAK (Çok Uzun): "Alışveriş yapmadan önce Juzdan uygulamasındaki kampanyalar menüsünden Hemen Katıl butonuna tıklayarak katılım sağlayabilirsiniz."
   - DOĞRU (İDEAL): "Juzdan'dan 'Hemen Katıl' butonuna tıklayın veya '[ANAHTAR_KELİME]' yazıp 4566'ya SMS gönderin."
   - DOĞRU (İDEAL): "Juzdan üzerinden 'Hemen Katıl' deyin."
   - **SMS VARSA ZORUNLU KURAL:** Asla "SMS ile katılın" yazıp bırakma! Metinde GÖRDÜĞÜN anahtar kelimeyi (örn: TEKNOSA, TATIL, MARKET) ve numarayı yaz.
   - **YASAK (HALÜSİNASYON):** Metinde SMS kodu yoksa ASLA uydurma (özellikle 'A101' gibi başka kodları YAZMA).
   - YANLIŞ: "SMS ile kayıt olun." (NUMARA VE KOD NEREDE?)

4. **KART TESPİTİ (eligible_customers):**
   - Metin içinde "Ticari", "Business", "KOBİ" geçiyorsa, eligible_customers listesine ilgili kartları (Axess Business, Wings Business vb.) MUTLAKA ekle. Bireysel kartları EKSİK ETME.

5. **BRAND MATCHING:**
   - Match brands against: [${sortedBrands} ... and others].

6. **ABSOLUTE NO-HALLUCINATION RULE:**
   - IF not explicitly found -> return null.
   - NEVER use placeholder numbers.
`;

    const dynamicContent = `
CONTEXT: Today is ${today}.
SOURCE BANK AUTHORITY: ${sourceBank || 'Akbank'}
SOURCE CARD AUTHORITY: ${sourceCard || 'Axess'}

TEXT TO PROCESS:
"${text.replace(/"/g, '\\"')}"
`;

    const stage1Prompt = staticPrefix + dynamicContent;

    // Smart Hybrid: Model selection (Currently standardized to FLASH_MODEL)
    const useThinking = shouldUseThinking(text);
    const selectedModel = useThinking ? THINKING_MODEL : FLASH_MODEL;
    const modelLabel = useThinking ? '🧠 THINKING' : '⚡ FLASH';

    console.log(`   ${modelLabel} Stage 1: Full parse...`);

    const stage1Data = await callGeminiAPI(stage1Prompt, selectedModel);

    // Check for missing critical fields
    const missingFields = checkMissingFields(stage1Data);

    if (missingFields.length === 0) {
        console.log('   ✅ Stage 1: Complete (all fields extracted)');
        // Ensure brand is properly formatted as a string/json for DB
        if (Array.isArray(stage1Data.brand)) {
            stage1Data.brand = stage1Data.brand.join(', ');
        }

        // STRICT OVERRIDE: Source Bank/Card TRUMPS AI
        if (sourceBank) {
            stage1Data.bank = sourceBank;
        }
        if (sourceCard) {
            stage1Data.card_name = sourceCard;
        }

        return stage1Data;
    }

    // STAGE 2: Fill Missing Fields
    console.log(`   🔄 Stage 2: Filling missing fields: ${missingFields.join(', ')} `);

    const stage2Prompt = `
You are refining campaign data.The following fields are MISSING and MUST be extracted:

${missingFields.map(field => `- ${field}`).join('\n')}

Extract ONLY these missing fields from the text below.Return JSON with ONLY these fields.

FIELD DEFINITIONS:
    - valid_until: Campaign end date in YYYY - MM - DD format
        - eligible_customers: Array of eligible card types
            - min_spend: Minimum spending amount as a number
                - earning: Reward amount or description(e.g. "500 TL Puan")
                    - category: MUST be EXACTLY one of: ${masterData.categories.join(', ')}. If unsure, return "Diğer".
- bank: MUST be EXACTLY one of: ${masterData.banks.join(', ')}. ${sourceBank ? `(Source: ${sourceBank})` : ''}
    - brand: Array of strings representing ALL mentioned merchants / brands.DO NOT include card names(Axess, Wings, etc.).

### 🛑 CRITICAL: NO HALLUCINATION
        - If the requested field is NOT clearly present in the text, return null. 
        - If the requested field is NOT clearly present in the text, return null.
- DO NOT invent numbers.
- DO NOT use previous campaign values.
- If it's JUST an installment campaign (taksit) and NO points/rewards mentioned, earning MUST be a 2-3 word summary of the installment benefit (e.g. "Vade Farksız").

    TEXT:
    "${text.replace(/"/g, '\\"')}"

Return ONLY valid JSON with the missing fields, no markdown.
`;

    const stage2Data = await callGeminiAPI(stage2Prompt);

    // Merge stage 1 and stage 2 data
    const finalData = {
        ...stage1Data,
        ...stage2Data
    };

    const title = finalData.title || '';
    const description = finalData.description || '';

    // STAGE 3: Bank Service Detection & "Genel" logic
    // Detect keywords for bank-only services (not related to a specific merchant brand)
    const isBankService = /ekstre|nakit avans|kredi kartı başvurusu|limit artış|borç transferi|borç erteleme|başvuru|otomatik ödeme|kira|harç|bağış/i.test(title + ' ' + description);

    // STAGE 4: Historical Assignment Lookup (Learning Mechanism)
    // Check if this specific campaign was previously mapped to a brand by the user
    const { data: pastCampaign } = await supabase
        .from('campaigns')
        .select('brand, category')
        .eq('title', title)
        .not('brand', 'is', null)
        .not('brand', 'eq', '')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Use unified brand cleanup
    const masterDataForFinal = await fetchMasterData();
    const brandCleaned = await cleanupBrands(finalData.brand, masterDataForFinal);

    finalData.brand = brandCleaned.brand;
    finalData.brand_suggestion = brandCleaned.suggestion;

    if (isBankService) {
        console.log(`   🏦 Bank service detected for "${title}", mapping to "Genel"`);
        finalData.brand = 'Genel';
        finalData.brand_suggestion = ''; // Clear suggestion if it's a bank service
    } else if (pastCampaign) {
        console.log(`   🧠 Learning: Previously mapped to brand "${pastCampaign.brand}" for "${title}"`);
        finalData.brand = pastCampaign.brand;
        finalData.brand_suggestion = ''; // Use historical data, clear suggestion

        // Validate learned category against master list logic
        if (pastCampaign.category && masterData.categories.includes(pastCampaign.category)) {
            finalData.category = pastCampaign.category;
        } else if (pastCampaign.category) {
            console.log(`   ⚠️  Ignoring invalid learned category: "${pastCampaign.category}"`);
        }
    }

    // 🔗 Generic Brand Fallback (Genel) if still empty
    if (!finalData.brand || finalData.brand === '') {
        const titleLower = title.toLowerCase();
        const descLower = description.toLowerCase();

        // Keywords that strongly hint at "Genel" (non-brand specific or loyalty points)
        const genericKeywords = [
            'marketlerde', 'akaryakıt istasyonlarında', 'giyim mağazalarında',
            'restoranlarda', 'kafe', 'tüm sektörler', 'seçili sektörl',
            'üye işyeri', 'pos', 'vade farksız', 'taksit', 'faizsiz', 'masrafsız',
            'alışverişlerinizde', 'harcamanıza', 'ödemelerinize', 'chip-para', 'puan'
        ];

        if (genericKeywords.some(kw => titleLower.includes(kw) || descLower.includes(kw))) {
            finalData.brand = 'Genel';
        }
    }

    // Category Validation: Ensure it's in the master list
    const masterCategories = masterData.categories;
    if (finalData.category && !masterCategories.includes(finalData.category)) {
        console.warn(`   ⚠️  AI returned invalid category: "${finalData.category}", mapping to "Diğer"`);
        finalData.category = 'Diğer';
    }

    // Generate sector_slug from category
    if (finalData.category) {
        if (finalData.category === 'Diğer' || finalData.category === 'Genel') {
            const titleLower = title.toLowerCase();
            if (titleLower.includes('market') || titleLower.includes('gıda')) finalData.category = 'Market & Gıda';
            else if (titleLower.includes('giyim') || titleLower.includes('moda') || titleLower.includes('aksesuar')) finalData.category = 'Giyim & Aksesuar';
            else if (titleLower.includes('akaryakıt') || titleLower.includes('benzin') || titleLower.includes('otopet') || titleLower.includes('yakıt')) finalData.category = 'Akaryakıt';
            else if (titleLower.includes('restoran') || titleLower.includes('yemek') || titleLower.includes('kafe')) finalData.category = 'Restoran & Kafe';
            else if (titleLower.includes('seyahat') || titleLower.includes('tatil') || titleLower.includes('uçak') || titleLower.includes('otel') || titleLower.includes('konaklama')) finalData.category = 'Turizm & Konaklama';
            else if (titleLower.includes('elektronik') || titleLower.includes('teknoloji')) finalData.category = 'Elektronik';
            else if (titleLower.includes('mobilya') || titleLower.includes('dekorasyon')) finalData.category = 'Mobilya & Dekorasyon';
            else if (titleLower.includes('kozmetik') || titleLower.includes('sağlık')) finalData.category = 'Kozmetik & Sağlık';
        }
        finalData.sector_slug = generateSectorSlug(finalData.category);
    } else {
        finalData.category = 'Diğer';
        finalData.sector_slug = 'diger';
    }

    console.log('   ✅ Stage 2: Complete');

    // SYNC EARNING AND DISCOUNT
    syncEarningAndDiscount(finalData);

    const stillMissing = checkMissingFields(finalData);
    if (stillMissing.length > 0) {
        console.warn(`   ⚠️  WARNING: Still missing critical fields: ${stillMissing.join(', ')} `);
        finalData.ai_parsing_incomplete = true;
        finalData.missing_fields = stillMissing;
    }

    // STRICT OVERRIDE BEFORE RETURN: Source Bank/Card TRUMPS AI
    // this ensures that no matter what the AI hallucinated for bank/card, the scraper's authority wins
    if (sourceBank) {
        finalData.bank = sourceBank;
    }
    if (sourceCard) {
        finalData.card_name = sourceCard;
    }

    // GENERATE SEO SLUG
    if (finalData.title) {
        finalData.slug = generateCampaignSlug(finalData.title);
    }

    return finalData;
}

function normalizeBrands(brandData: any): string[] {
    // Handle null/undefined
    if (!brandData) return [];

    // If it's already an array
    if (Array.isArray(brandData)) {
        return brandData
            .map(b => {
                // Remove quotes and extra whitespace
                if (typeof b === 'string') {
                    return b.replace(/^["']|["']$/g, '').trim();
                }
                return String(b).trim();
            })
            .filter(b => b && b !== '""' && b !== "''") // Remove empty strings and quote-only strings
            .flatMap(b => {
                // Split comma-separated brands
                if (b.includes(',')) {
                    return b.split(',').map(x => x.trim()).filter(x => x);
                }
                return [b];
            });
    }

    // If it's a string (shouldn't happen but handle it)
    if (typeof brandData === 'string') {
        const cleaned = brandData.replace(/^["'\[]|["'\]]$/g, '').trim();

        if (!cleaned || cleaned === '""' || cleaned === "''") {
            return [];
        }

        // Split by comma if present
        if (cleaned.includes(',')) {
            return cleaned.split(',')
                .map(b => b.trim().replace(/^["']|["']$/g, '').trim())
                .filter(b => b && b !== '""' && b !== "''");
        }

        return [cleaned];
    }

    return [];
}
