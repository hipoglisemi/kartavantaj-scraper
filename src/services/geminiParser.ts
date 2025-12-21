/**
 * Enhanced Gemini AI Parser with Master Data Integration
 * Fetches valid banks, brands, and categories from Supabase
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_KEY!;
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const CRITICAL_FIELDS = ['valid_until', 'eligible_customers', 'min_spend', 'category', 'bank', 'brand', 'earning'];

interface MasterData {
    categories: string[];
    brands: string[];
    banks: string[];
}

let cachedMasterData: MasterData | null = null;

async function fetchMasterData(): Promise<MasterData> {
    if (cachedMasterData) return cachedMasterData;

    console.log('📚 Fetching master data from Supabase...');

    const [categoriesRes, brandsRes] = await Promise.all([
        supabase.from('master_categories').select('name'),
        supabase.from('master_brands').select('name')
    ]);

    const categories = categoriesRes.data?.map(c => c.name) || [
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
const MIN_REQUEST_INTERVAL_MS = 5000; // Minimum 5 seconds between requests (12 RPM limit)

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
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
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

        const cleanJson = responseText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

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

export async function parseWithGemini(html: string, url: string): Promise<any> {
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
  "description": "string (2-3 sentences with emojis)",
  "category": "string (MUST be one of: ${masterData.categories.join(', ')})",
  "discount": "string (e.g., '1000 TL İndirim')",
  "earning": "string (e.g., '500 TL Puan')",
  "min_spend": number (minimum spending),
  "max_discount": number,
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
  "brand": ["array of brand names from the list if multiple merchants mentioned, or empty array"]
  "ai_enhanced": true
}

CRITICAL RULES:
- category: MUST be EXACTLY one from the list above
- bank: MUST be EXACTLY one from the list above (for WorldCard, use "Yapı Kredi")
- brand: If merchant is in the brands list, use EXACT name. Otherwise leave empty.
- Extract ALL fields, especially: valid_until, eligible_customers, min_spend, category, bank

Use Turkish language. Return ONLY valid JSON, no markdown.

TEXT:
"${text.replace(/"/g, '\\"')}"
`;

    console.log('   🤖 Stage 1: Full parse...');
    const stage1Data = await callGeminiAPI(stage1Prompt);

    // Check for missing critical fields
    const missingFields = checkMissingFields(stage1Data);

    if (missingFields.length === 0) {
        console.log('   ✅ Stage 1: Complete (all fields extracted)');
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
- bank: MUST be EXACTLY one of: ${masterData.banks.join(', ')}
- brand: MUST be from: ${masterData.brands.slice(0, 50).join(', ')}... or empty

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

    // Clean up brand data
    if (finalData.brand) {
        finalData.brand = normalizeBrands(finalData.brand);
    }

    console.log('   ✅ Stage 2: Complete (missing fields filled)');

    // Final validation: Ensure critical fields are present
    const stillMissing = checkMissingFields(finalData);
    if (stillMissing.length > 0) {
        console.warn(`   ⚠️  WARNING: Still missing critical fields after 2 stages: ${stillMissing.join(', ')}`);
        console.warn(`   ⚠️  This campaign may have incomplete data. URL: ${url}`);

        // Add a flag to indicate incomplete data
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
