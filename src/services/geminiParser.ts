import * as dotenv from 'dotenv';
import { generateSectorSlug } from '../utils/slugify';
import { syncEarningAndDiscount } from '../utils/dataFixer';
import { supabase } from '../utils/supabase';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_KEY!;

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
const MIN_REQUEST_INTERVAL_MS = 1000;

// SAFETY SWITCH: Set to true to completely block AI calls during testing
const DISABLE_AI_COMPLETELY = true;

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
    const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000);

    const masterData = await fetchMasterData();

    // STAGE 1: Full Parse
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const stage1Prompt = `
CONTEXT: Today is ${today}. Use this date to resolve relative dates like "31 Aralık" to the correct year (${today.split('-')[0]}).

Extract campaign data into JSON matching this EXACT schema:

{
  "title": "string (catchy campaign title, clear and concise)",
  "description": "string (Rich marketing text. Focus on benefits. Max 4-5 sentences. Do NOT include boring legal terms here.)",
  "conditions": ["string (Rule 1)", "string (Rule 2)"],
  "category": "string (MUST be one of: ${masterData.categories.join(', ')})",
  "discount": "string (Use ONLY for installment info, e.g. '9 Taksit', '+3 Taksit'. FORMAT: '{Number} Taksit'. NEVER mention fees/interest.)",
  "earning": "string (Use ONLY for points/cashback. FORMAT: '{Amount} TL Puan' or '{Amount} TL İndirim' or '%{X} İndirim'. MAX 20 chars.)",
  "min_spend": number (CRITICAL: Total required spend. If title says '500 TL ve üzeri', min_spend is 500. Total sum if multiple steps.),
  "max_discount": number (Max reward limit per customer/campaign),
  "discount_percentage": number (If % based reward, e.g. 15 for %15),
  "valid_from": "YYYY-MM-DD",
  "valid_until": "YYYY-MM-DD",
  "participation_method": "string (brief: e.g. 'Mobil Uygulama', 'SMS', 'Katılım gerekmez')",
  "merchant": "string (Primary shop/brand name)",
  "bank": "string (AUTHORITY: MUST be exactly '${sourceBank || 'the one in text'}'. Allowed: ${masterData.banks.join(', ')})",
  "card_name": "string (AUTHORITY: MUST be exactly '${sourceCard || 'the one in text'}')",
  "brand": ["array of strings (Official brand names)"],
  "ai_enhanced": true
}

### 🛑 ULTRA-STRICT RULES (Failure is NOT an option):

1. **BANK & CARD AUTHORITY (HIGHEST PRIORITY):**
   - If sourceBank is provided as "${sourceBank}", you MUST use it. DO NOT hallucinate other banks.
   - If sourceCard is provided as "${sourceCard}", you MUST use it. DO NOT change it to something else.
   
2. **REWARD CONSOLIDATION (Single Box Standard):**
   - If the campaign has BOTH installments and points:
     - Installment (e.g., "9 Taksit") goes to "discount" field.
     - Points (e.g., "500 TL Puan") goes to "earning" field.
   - FORMAL FORMATTING: "500 TL Puan" (NOT 500 Bonus/Chip), "9 Taksit" (NOT Vade farksız 9 taksit).
   
3. **MATHEMATICAL SANITY CHECK:**
   - Earning vs Min_Spend: Earning MUST be significantly lower than min_spend (e.g., spending 10,000 to get 500 is normal).
   - If you see "1.000 TL indirim" for a "150 TL" purchase, you are wrong. Check if it means "1.000 TL'ye kadar" or "%10".
   
4. **BRAND MATCHING:**
   - Match brands against: [${masterData.brands.slice(0, 50).join(', ')} ... and others].
   - NORMALIZE: Remove ".com", "Market", "Notebook" suffixes. Use "Migros" instead of "Migros Sanal Market".
   
5. **DATES:** If no year is mentioned, assume 2024/2025 based on current context. Format: YYYY-MM-DD.

TEXT TO PROCESS:
"${text.replace(/"/g, '\\"')}"
`;

    console.log('   🤖 Stage 1: Full parse...');
    const stage1Data = await callGeminiAPI(stage1Prompt);

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
    console.log(`   🔄 Stage 2: Filling missing fields: ${missingFields.join(', ')}`);

    const stage2Prompt = `
You are refining campaign data. The following fields are MISSING and MUST be extracted:

${missingFields.map(field => `- ${field}`).join('\n')}

Extract ONLY these missing fields from the text below. Return JSON with ONLY these fields.

FIELD DEFINITIONS:
- valid_until: Campaign end date in YYYY-MM-DD format
- eligible_customers: Array of eligible card types
- min_spend: Minimum spending amount as a number
- earning: Reward amount or description (e.g. "500 TL Puan")
- category: MUST be EXACTLY one of: ${masterData.categories.join(', ')}
- bank: MUST be EXACTLY one of: ${masterData.banks.join(', ')}. ${sourceBank ? `(Source: ${sourceBank})` : ''}
- brand: Array of strings representing ALL mentioned merchants/brands.

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
