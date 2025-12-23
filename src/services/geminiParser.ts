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

    console.log('📚 Fetching master data from Supabase...');

    const [sectorsRes, brandsRes] = await Promise.all([
        supabase.from('master_sectors').select('name'),
        supabase.from('master_brands').select('name')
    ]);

    // Use master_sectors (same as frontend) instead of master_categories
    const categories = sectorsRes.data?.map(c => c.name) || [
        'Market', 'Yakıt', 'Restoran & Kafe', 'Elektronik', 'Giyim & Moda',
        'Ev & Yaşam', 'Online Alışveriş', 'Seyahat', 'Eğlence', 'Sağlık & Güzellik',
        'Spor & Outdoor', 'Kitap & Kırtasiye', 'Diğer'
    ];

    const brands = brandsRes.data?.map(b => b.name) || [];

    const banks = [
        'Yapı Kredi',
        'Garanti BBVA',
        'İş Bankası',
        'Akbank',
        'QNB Finansbank',
        'Ziraat Bankası',
        'Halkbank',
        'Vakıfbank',
        'Denizbank',
        'TEB',
        'ING',
        'Diğer'
    ];

    cachedMasterData = { categories, brands, banks };
    console.log(`✅ Loaded: ${categories.length} categories, ${brands.length} brands, ${banks.length} banks`);

    return cachedMasterData;
}

// Rate limiting: Track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000; // Minimum 1 second between requests (unlimited RPM with 2.5-flash)

// Sleep utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiAPI(prompt: string, retryCount = 0): Promise<any> {
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 2000; // Start with 2 seconds

    try {
        // Rate limiting: Ensure minimum interval between requests
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
            const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
            console.log(`   ⏳ Rate limiting: waiting ${waitTime}ms...`);
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
            console.log(`   ⚠️  Rate limit hit (429). Retry ${retryCount + 1}/${MAX_RETRIES} after ${retryDelay}ms...`);
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
    const brandCleaned = cleanupBrands(result.brand, masterData);
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
 * Normalizes and cleans brand data to ensure it's a flat string and matches master data.
 */
function cleanupBrands(brandInput: any, masterData: MasterData): { brand: string, suggestion: string } {
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
            unmatched.push(b.trim());
        }
    }

    return {
        brand: [...new Set(matched)].join(', '),
        suggestion: matched.length === 0 ? [...new Set(unmatched)].join(', ') : ''
    };
}

export async function parseWithGemini(html: string, url: string, sourceBank?: string): Promise<any> {
    const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000);

    const masterData = await fetchMasterData();

    // STAGE 1: Full Parse
    const stage1Prompt = `
Extract campaign data into JSON matching this EXACT schema:

{
  "title": "string (catchy campaign title)",
  "description": "string (2-3 sentences with emojis)",
  "category": "string (MUST be one of: ${masterData.categories.join(', ')})",
  "discount": "string (CONCISE summary, max 20 chars, e.g. '1000 TL İndirim')",
  "earning": "string (CONCISE total benefit, max 20 chars. IMPORTANT: Use 'Puan' for points/cashback, 'İndirim' for discounts. E.g. '500 TL Puan', '%10 İndirim')",
  "min_spend": number (CRITICAL: If the campaign is cumulative (e.g. 'Every 2500 TL get 150 TL, total 2000 TL'), calculate the TOTAL spend required to get the full reward. E.g. (2000/150)*2500 = 33333. If it's a single transaction campaign, use the minimum transaction amount.),
  "max_discount": number (The TOTAL maximum earning/discount cap for the entire campaign, not per transaction. If 'max 100 TL', put 100.),
  "discount_percentage": number,
  "valid_from": "YYYY-MM-DD",
  "valid_until": "YYYY-MM-DD",
  "participation_method": "string (brief how-to)",
  "participation_points": ["array", "of", "steps"],
  "conditions": ["array", "of", "rules"],
  "eligible_customers": ["array", "of", "card types"],
  "valid_locations": ["array", "of", "locations"],
  "merchant": "string (store name)",
  "difficulty_level": "string (Kolay/Orta/Zor)",
  "bank": "string (MUST be one of: ${masterData.banks.join(', ')})",
  "card_name": "string (card type)",
  "brand": ["array", "of", "brand", "names", "mentioned", "in", "the", "campaign"],
  "ai_enhanced": true
}

CRITICAL RULES:
- category: MUST be EXACTLY one from the list above.
- bank: MUST be EXACTLY one from the list above. ${sourceBank ? `The source bank is likely "${sourceBank}", use this unless explicitly stated otherwise.` : ''}
- brand: Extract ALL mentioned brands (e.g. "Burger King", "Migros"). Return them as an ARRAY of strings. Match names to the list below if possible, otherwise use the canonical merchant name. List ALL brands if multiple are mentioned. List: ${masterData.brands.slice(0, 200).join(', ')}...
- Extraction: Extract ALL fields, especially valid_until, category, and bank.
- Formatting: Return ONLY valid JSON, no markdown.

TEXT:
"${text.replace(/"/g, '\\"')}"

IMPORTANT: Avoid 'Diğer' if possible. Guess the most likely category based on keywords (e.g. 'Market', 'Giyim', 'Akaryakıt').
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
    const brandCleaned = cleanupBrands(finalData.brand, masterDataForFinal);

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
