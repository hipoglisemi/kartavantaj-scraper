import * as dotenv from 'dotenv';
import { generateSectorSlug } from '../utils/slugify';
import { syncEarningAndDiscount } from '../utils/dataFixer';
import { supabase } from '../utils/supabase';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_KEY!;

const CRITICAL_FIELDS = ['valid_until', 'eligible_customers', 'min_spend', 'category', 'bank', 'earning'];

/**
 * Removes legal boilerplate and generic bank disclaimers from text.
 * Used to clean input before sending to AI for summarization.
 * IMPORTANT: This does NOT affect the original text stored in DB.
 */
function cleanLegalText(text: string): string {
    if (!text) return "";

    const legalPatterns = [
        /banka[, ]+kampanyayı[, ]+durdurma(?:[\s,]+değiştirme)?[, ]+hakkını[, ]+saklı[, ]+tutar/gi,
        /yasal[, ]+mevzuat[, ]+gereği/gi,
        /6698[, ]+sayılı[, ]+kişisel[, ]+verilerin[, ]+korunması[, ]+kanunu/gi,
        /kvkk[, ]+kapsamında/gi,
        /vergi[, ]+ve[, ]+fonlar[, ]+dahildir/gi,
        /bsmv[, ]+ve[, ]+kkdf/gi,
        /bankamız[, ]+tek[, ]+taraflı[, ]+olarak/gi,
        /kampanya[, ]+koşullarında[, ]+değişiklik[, ]+yapma[, ]+hakkı/gi,
        /önceden[, ]+haber[, ]+vermeksizin/gi,
        /sorumluluk[, ]+kabul[, ]+edilmez/gi,
        /yasal[, ]+uyarı:?/gi,
        /tüm[, ]+hakları[, ]+saklıdır/gi,
        /ayrıntılı[, ]+bilgi[, ]+için/gi
    ];

    let cleaned = text;
    legalPatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });

    // Remove empty lines and double spaces resulting from cleaning
    return cleaned.replace(/\s+/g, ' ').trim();
}

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
const MIN_REQUEST_INTERVAL_MS = 1000;

// SAFETY SWITCH: Set to true to completely block AI calls during testing
const DISABLE_AI_COMPLETELY = false; // AI ENABLED for backend scraper

// Sleep utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiAPI(prompt: string, retryCount = 0): Promise<any> {
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 2000;

    if (DISABLE_AI_COMPLETELY) {
        console.log('   🛑 AI BLOCKED: DISABLE_AI_COMPLETELY is set to true.');
        throw new Error('AI_CALL_BLOCKED');
    }

    try {
        // Rate limiting: Ensure minimum interval between requests
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
            const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
            console.log(`   ⏳ Hız sınırlama: ${waitTime}ms bekleniyor...`);
            await sleep(waitTime);
        }
        lastRequestTime = Date.now();

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        // Handle 429 (Too Many Requests) with exponential backoff
        if (response.status === 429) {
            if (retryCount >= MAX_RETRIES) {
                throw new Error(`Gemini API rate limit exceeded after ${MAX_RETRIES} retries`);
            }

            const retryDelay = BASE_DELAY_MS * Math.pow(2, retryCount); // Exponential: 2s, 4s, 8s
            console.log(`   ⚠️  Hız limitine takıldı (429). Deneme ${retryCount + 1}/${MAX_RETRIES}, ${retryDelay}ms sonra...`);
            await sleep(retryDelay);
            return callGeminiAPI(prompt, retryCount + 1);
        }

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data: any = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error('No response from Gemini');
        }

        // Robust JSON extraction: Find the first '{' and last '}' to avoid conversational text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error(`AI returned text but no valid JSON object was found. Base Response: "${responseText.substring(0, 100)}..."`);
        }

        const cleanJson = jsonMatch[0].trim();
        return JSON.parse(cleanJson);
    } catch (error: any) {
        // Retry on network errors or JSON parse errors (but not on 429, handled above)
        if (retryCount < MAX_RETRIES && !error.message.includes('rate limit')) {
            const retryDelay = BASE_DELAY_MS * Math.pow(2, retryCount);
            console.log(`   ⚠️  Error: ${error.message}. Retry ${retryCount + 1}/${MAX_RETRIES} after ${retryDelay}ms...`);
            await sleep(retryDelay);
            return callGeminiAPI(prompt, retryCount + 1);
        }
        throw error;
    }
}

function checkMissingFields(data: any): string[] {
    const missing: string[] = [];

    CRITICAL_FIELDS.forEach(field => {
        const value = data[field];
        if (!value ||
            (Array.isArray(value) && value.length === 0) ||
            value === null ||
            value === undefined) {
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

EXISTING DATA (for context):
Title: ${existingData.title}
Current Category: ${existingData.category}

MISSING FIELDS TO EXTRACT:
${missingFields.map(f => `- ${f}`).join('\n')}

FIELD DEFINITIONS:
- valid_until: YYYY-MM-DD
- eligible_customers: Array of strings
- min_spend: Number
- earning: String (e.g. "500 TL Puan")
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
    const isBankService = /ekstre|nakit avans|kredi kartı başvurusu|limit artış|borç transferi|vade farkı|faizsiz taksit|borç erteleme|sigorta|başvuru|otomatik ödeme/i.test(title + ' ' + description);

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

    // Strict Brand Cleanup (with AI validation for unknown brands)
    const brandCleaned = await cleanupBrands(result.brand, masterData, description);
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
 * Phase 8: Math Referee
 * Resolves conflicts or fills missing math fields using a 400-token-min snippet.
 */
export async function parseMathReferee(
    title: string,
    content: string,
    existingData: any
): Promise<any> {
    // 1. Extract token-min snippet (Title + 400 chars around numbers/keywords)
    const textCleaner = (t: string) => t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanContent = textCleaner(content);

    // Strategy: Find first number or spend/reward keyword and take 400 chars from there
    const keywords = ['harcama', 'puan', 'indirim', 'chip-para', 'bonus', 'taksit', 'tl', '%'];
    let startIndex = 0;
    const lowerContent = cleanContent.toLowerCase();

    for (const kw of keywords) {
        const idx = lowerContent.indexOf(kw);
        if (idx !== -1) {
            startIndex = Math.max(0, idx - 50);
            break;
        }
    }

    const snippet = cleanContent.substring(startIndex, startIndex + 400);

    console.log(`   🤖 Math Referee: Analyzing snippet for "${title.substring(0, 30)}..."`);

    const mathPrompt = `
Analyze this bank campaign snippet and extract EXACT math details.
TITLE: ${title}
SNIPPET: "${snippet}"

RETURN JSON ONLY:
{
  "min_spend": number,
  "reward_value": number,
  "reward_unit": "tl" | "%" | "taksit",
  "reward_type": "puan" | "indirim" | "taksit",
  "max_discount": number,
  "discount_percentage": number
}

RULES:
- If "min_spend" is not mentioned, return 0.
- If multiple steps exist, return the FIRST step as reward_value and the TOTAL cap as max_discount.
- discount_percentage is the rate like 10 for %10. If not found, return 0.
- max_discount is the absolute cap like 500 for "500 TL'ye kadar". If not found, return 0.
- Be precise. Turkish suffixes like "TL'ye" mean "to TL".
`;

    try {
        const aiMath = await callGeminiAPI(mathPrompt);

        // Normalize AI response to match our internal suggestion structure
        return {
            min_spend: aiMath.min_spend || 0,
            earning: aiMath.reward_type !== 'taksit' ? `${aiMath.reward_value} ${aiMath.reward_unit?.toUpperCase()} ${aiMath.reward_type}` : null,
            max_discount: aiMath.max_discount || 0,
            discount_percentage: aiMath.discount_percentage || (aiMath.reward_unit === '%' ? aiMath.reward_value : 0),
            discount: aiMath.reward_type === 'taksit' ? `${aiMath.reward_value} Taksit` : null,
            reward_type: aiMath.reward_type,
            reward_value: aiMath.reward_value,
            reward_unit: aiMath.reward_unit
        };
    } catch (err) {
        console.error('   ❌ Math Referee failed:', err);
        return null; // Don't crash the whole process
    }
}

/**
 * Minimal Reward Type Labeler (Snippet AI) - Ultra-min token usage
 */
export async function parseRewardTypeAI(title: string, cleanText: string): Promise<any> {
    const snippet = (title + ' ' + cleanText).substring(0, 400);

    console.log(`   🤖 Reward Labeler: Analyzing snippet for type classification...`);

    const prompt = `
Return ONLY JSON:
{
  "reward_type": "perk" | "points" | "cashback" | "discount_pct" | "installment" | "mixed" | "unknown",
  "perk_text": "string|null (Brief description if perk)",
  "coupon_code": "string|null",
  "participation_method": "AUTO" | "SMS" | "JUZDAN" | "MOBILE_APP" | "CALL_CENTER" | "WEB" | null,
  "spend_channel": "IN_STORE_POS" | "ONLINE" | "IN_APP" | "MERCHANT_SPECIFIC" | "MEMBER_MERCHANT" | "UNKNOWN" | null,
  "eligible_cards": ["string"] | []
}
No extra keys, no explanation.

TITLE: ${title}
TEXT: "${snippet}"
`;

    try {
        return await callGeminiAPI(prompt);
    } catch (err) {
        console.error('   ❌ Reward Labeler failed:', err);
        return null;
    }
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
 * NEW: Uses AI brand validator for unknown brands (with minimal context snippet).
 */
async function cleanupBrands(
    brandInput: any,
    masterData: MasterData,
    campaignText: string = '' // NEW: Full campaign text for snippet extraction
): Promise<{ brand: string, suggestion: string }> {
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

    // Process new brands: AI Validation (NEW!)
    if (unmatched.length > 0) {
        console.log(`   🆕 New brands detected: ${unmatched.join(', ')}`);

        // Import validator (lazy load to avoid circular dependencies)
        const { validateBrand } = await import('./brandValidator');

        for (const newBrand of unmatched) {
            try {
                // Double check if it exists in DB (case insensitive)
                const { data: existing } = await supabase
                    .from('master_brands')
                    .select('name')
                    .ilike('name', newBrand)
                    .single();

                if (!existing) {
                    // NEW: Check Brand Aliases first
                    const normalizedAlias = newBrand.toLowerCase().trim();
                    const { data: aliasMatch } = await supabase
                        .from('brand_aliases')
                        .select('master_brands(name)')
                        .eq('alias_norm', normalizedAlias)
                        .maybeSingle();

                    if (aliasMatch && (aliasMatch as any).master_brands) {
                        const canonicalName = (aliasMatch as any).master_brands.name;
                        console.log(`   🔗 Alias Match: "${newBrand}" -> "${canonicalName}"`);
                        matched.push(canonicalName);
                        continue; // Skip AI validation
                    }

                    // Extract context snippet (300-400 chars around brand mention)
                    let snippet = '';
                    if (campaignText) {
                        const brandIndex = campaignText.toLowerCase().indexOf(newBrand.toLowerCase());
                        if (brandIndex !== -1) {
                            const start = Math.max(0, brandIndex - 150);
                            const end = Math.min(campaignText.length, brandIndex + 250);
                            snippet = campaignText.substring(start, end).trim();
                        } else {
                            // Brand not found in text, use first 400 chars
                            snippet = campaignText.substring(0, 400);
                        }
                    } else {
                        snippet = `Brand: ${newBrand}`;
                    }

                    // 🤖 AI Validation (200 tokens vs 4,500)
                    const validation = await validateBrand(newBrand, snippet);

                    if (validation.decision === 'AUTO_ADD') {
                        console.log(`   ✅ AI Verified & Adding: ${newBrand} (${validation.reason})`);

                        const { error } = await supabase
                            .from('master_brands')
                            .insert([{ name: newBrand }]);

                        if (!error) {
                            matched.push(newBrand);
                            masterData.brands.push(newBrand);
                        } else {
                            console.error(`   ❌ DB Error adding ${newBrand}:`, error.message);
                        }
                    } else if (validation.decision === 'PENDING_REVIEW') {
                        console.log(`   ⏸️ Pending Review: ${newBrand} (${validation.reason})`);
                        // Don't add to matched, but don't reject either
                        // Could add to brand_suggestions table here
                    } else {
                        console.log(`   🚫 AI Rejected: ${newBrand} (${validation.reason})`);
                        // Don't add to matched
                    }
                } else {
                    matched.push(existing.name);
                }
            } catch (err) {
                console.error(`   ❌ Failed to validate brand ${newBrand}:`, err);
            }
        }
    }

    return {
        brand: [...new Set(matched)].join(', '),
        suggestion: ''
    };
}

export async function parseWithGemini(html: string, url: string, sourceBank?: string, sourceCard?: string): Promise<any> {
    const rawText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Pre-filter legal boilerplate before sending to AI
    const filteredText = cleanLegalText(rawText);
    const text = filteredText.substring(0, 15000);

    const masterData = await fetchMasterData();

    // STAGE 1: Full Parse
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const stage1Prompt = `
You are a FINANCIAL CAMPAIGN PARSER.
Your task is NOT to write marketing text.
Your task is to READ, CALCULATE, and STRUCTURE campaign data with MATHEMATICAL ACCURACY.

CONTEXT: Today is ${today}. Use this date to resolve relative dates like "31 Aralık" to the correct year (${today.split('-')[0]}).

### 🛑 ULTRA-STRICT RULES (Failure is NOT an option):
1. **BRAND & CARD DISTINCTION:**
   - Merchant / Brand = place where shopping is done (e.g. Tatilsepeti, Teknosa).
   - Card names (Axess, World, Bonus, Maximum, Paraf, Akbank) are NOT merchants. NEVER return card names as merchant/brand.
   - Match brands against: [${masterData.brands.slice(0, 50).join(', ')} ... and others].

2. **MATHEMATICAL CALCULATION (CRITICAL):**
   - You MUST calculate the spending required to achieve the MAXIMUM POSSIBLE REWARD.
   - If tiered: Use the tier that gives the MAXIMUM reward.
   - If incremental ("1.000 TL harcamaya 100 TL"): Calculate min_spend for total max reward (e.g., if max is 500, min_spend = 5.000).
   - "Varan/Kadar" expressions: Calculate the MAXIMUM THEORETICAL value.
   - min_spend MUST be >= max_total_gain.

3. **BANK & CARD AUTHORITY:**
   - Bank MUST beExactly '${sourceBank || 'specified in text'}'. Allowed: ${masterData.banks.join(', ')}.
   - Card MUST be exactly '${sourceCard || 'specified in text'}'.

Extract campaign data into JSON matching this EXACT schema:

{
  "title": "string (original campaign title)",
  "description": "string (Professional summary for marketing, focus on benefits, 1-2 emojis, Turkish)",
  "category": "string (MUST be exactly one of: ${masterData.categories.join(', ')})",
  "min_spend": number,
  "reward_text": "string (FORMAT: '100 TL Puan', '50 TL İndirim' or '%10 İndirim'. Max 20 chars)",
  "installment_text": "string (FORMAT: '9 Taksit' or '+3 Taksit')",
  "max_total_gain": number,
  "tiers": [
    { "min_spend": number, "reward": number }
  ],
  "reward_type": "exact" | "max_possible",
  "math_confidence": "high" | "medium" | "low",
  "excluded_conditions": ["string"],
  "valid_from": "YYYY-MM-DD",
  "valid_until": "YYYY-MM-DD",
  "participation_method": "string (Natural Turkish explanation of HOW to participate, as found in text. e.g. 'Juzdan uygulamasından Hemen Katıl butonuna basarak' or 'KAYIT yazıp 4566\'ya mesaj göndererek'. AVOID short codes like 'SMS' or 'APP'.)",
  "eligible_cards": ["array of strings (List all specific eligible cards mentioned in the text, e.g. ['Axess', 'Wings', 'Akbank Kart'])"],
  "brand": ["array of strings (Official brand names)"],
  "ai_marketing_text": "string (A warm, catchy summary in Turkish, 1 line)",
  "ai_enhanced": true
}

TEXT TO PROCESS:
"${text.replace(/"/g, '\\"')}"
`;

    console.log('   🤖 Stage 1: Full parse...');
    const stage1Data = await callGeminiAPI(stage1Prompt);

    // Check for missing critical fields
    const missingFields = checkMissingFields(stage1Data);

    if (missingFields.length === 0) {
        console.log('   ✅ Stage 1: Complete (all fields extracted)');

        // MAP V5 FIELDS TO LEGACY SCHEMA FOR DB COMPATIBILITY
        const mappedData = {
            ...stage1Data,
            earning: stage1Data.reward_text,
            discount: stage1Data.installment_text,
            max_discount: stage1Data.max_total_gain,
            math_flags: [
                ...(stage1Data.math_flags || []),
                `confidence_${stage1Data.math_confidence}`,
                `reward_${stage1Data.reward_type}`
            ],
            // Store tiers as JSON string in conditions or specialized field if exists
            conditions: [
                ...(stage1Data.conditions || []),
                ...(stage1Data.excluded_conditions || []),
                stage1Data.tiers && stage1Data.tiers.length > 0 ? `MARKDOWN_TIERS: ${JSON.stringify(stage1Data.tiers)}` : null
            ].filter(Boolean)
        };

        // Ensure brand is properly formatted as a string/json for DB
        if (Array.isArray(mappedData.brand)) {
            mappedData.brand = mappedData.brand.join(', ');
        }

        // STRICT OVERRIDE: Source Bank/Card TRUMPS AI
        if (sourceBank) {
            mappedData.bank = sourceBank;
        }
        if (sourceCard) {
            mappedData.card_name = sourceCard;
        }

        return mappedData;
    }

    // STAGE 2: Fill Missing Fields
    console.log(`   🔄 Stage 2: Filling missing fields: ${missingFields.join(', ')}`);

    const stage2Prompt = `
You are refining campaign data. The following fields are MISSING and MUST be extracted:

${missingFields.map(field => `- ${field}`).join('\n')}

Extract ONLY these missing fields from the text below. Return JSON with ONLY these fields.

FIELD DEFINITIONS (V5 STANDARDS):
- valid_until: Campaign end date in YYYY-MM-DD format
- reward_text: Reward amount (e.g. "500 TL Puan")
- installment_text: Installment info (e.g. "9 Taksit")
- min_spend: Total spend required for MAXIMUM reward (Number)
- max_total_gain: Max reward limit (Number)
- category: MUST be EXACTLY one of: ${masterData.categories.join(', ')}
- bank: MUST be EXACTLY one of: ${masterData.banks.join(', ')}. ${sourceBank ? `(Source: ${sourceBank})` : ''}
- brand: Array of strings representing ALL mentioned merchants/brands.
- participation_method: Natural language explanation of how to participate.
- eligible_cards: Array of eligible card names.

TEXT:
"${text.replace(/"/g, '\\"')}"

Return ONLY valid JSON with the missing fields, no markdown.
`;

    const stage2Data = await callGeminiAPI(stage2Prompt);

    // Merge stage 1 and stage 2 data
    const mergedData = {
        ...stage1Data,
        ...stage2Data
    };

    // MAP V5 FIELDS TO LEGACY SCHEMA (Stage 2 Fallback)
    const finalData = {
        ...mergedData,
        earning: mergedData.reward_text || mergedData.earning,
        discount: mergedData.installment_text || mergedData.discount,
        max_discount: mergedData.max_total_gain || mergedData.max_discount,
        math_flags: [
            ...(mergedData.math_flags || []),
            mergedData.math_confidence ? `confidence_${mergedData.math_confidence}` : null,
            mergedData.reward_type ? `reward_${mergedData.reward_type}` : null
        ].filter(Boolean),
        conditions: [
            ...(mergedData.conditions || []),
            ...(mergedData.excluded_conditions || []),
            mergedData.tiers && mergedData.tiers.length > 0 ? `MARKDOWN_TIERS: ${JSON.stringify(mergedData.tiers)}` : null
        ].filter(Boolean),
        eligible_cards: mergedData.eligible_cards || []
    };

    const title = finalData.title || '';
    const description = finalData.description || '';

    // STAGE 3: Bank Service Detection & "Genel" logic
    // Detect keywords for bank-only services (not related to a specific merchant brand)
    const isBankService = /ekstre|nakit avans|kredi kartı başvurusu|limit artış|borç transferi|vade farkı|faizsiz taksit|borç erteleme|sigorta|başvuru|otomatik ödeme/i.test(title + ' ' + description);

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

    // Use unified brand cleanup (with AI validation for unknown brands)
    const masterDataForFinal = await fetchMasterData();
    const brandCleaned = await cleanupBrands(finalData.brand, masterDataForFinal, description);

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
        finalData.category = pastCampaign.category || finalData.category;
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

    // Generate sector_slug from category
    if (finalData.category) {
        if (finalData.category === 'Diğer' || finalData.category === 'Genel') {
            const titleLower = title.toLowerCase();
            if (titleLower.includes('market') || titleLower.includes('gıda')) finalData.category = 'Market';
            else if (titleLower.includes('giyim') || titleLower.includes('moda')) finalData.category = 'Giyim & Moda';
            else if (titleLower.includes('akaryakıt') || titleLower.includes('benzin') || titleLower.includes('otopet') || titleLower.includes('yakıt')) finalData.category = 'Yakıt';
            else if (titleLower.includes('restoran') || titleLower.includes('yemek')) finalData.category = 'Restoran & Kafe';
            else if (titleLower.includes('seyahat') || titleLower.includes('tatil') || titleLower.includes('uçak') || titleLower.includes('otel')) finalData.category = 'Seyahat';
            else if (titleLower.includes('elektronik') || titleLower.includes('teknoloji')) finalData.category = 'Elektronik';
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
        console.warn(`   ⚠️  WARNING: Still missing critical fields: ${stillMissing.join(', ')}`);
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
