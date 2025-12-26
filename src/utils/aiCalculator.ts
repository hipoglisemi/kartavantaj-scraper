// src/utils/aiCalculator.ts
import { supabase } from './supabase';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_KEY!;

interface MasterData {
    categories: string[];
    brands: string[];
}

let cachedMasterData: MasterData | null = null;

async function fetchMasterData(): Promise<MasterData> {
    if (cachedMasterData) return cachedMasterData;

    const [sectorsRes, brandsRes] = await Promise.all([
        supabase.from('master_sectors').select('name'),
        supabase.from('master_brands').select('name')
    ]);

    const categories = sectorsRes.data?.map(c => c.name) || [
        'Market & Gıda', 'Akaryakıt', 'Giyim & Aksesuar', 'Restoran & Kafe',
        'Elektronik', 'Mobilya & Dekorasyon', 'Kozmetik & Sağlık', 'E-Ticaret',
        'Ulaşım', 'Dijital Platform', 'Kültür & Sanat', 'Eğitim',
        'Sigorta', 'Otomotiv', 'Vergi & Kamu', 'Turizm & Konaklama', 'Diğer'
    ];

    const brands = brandsRes.data?.map(b => b.name) || [];

    cachedMasterData = { categories, brands };
    return cachedMasterData;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DISABLE_AI_COMPLETELY = true;

async function callGeminiAPI(prompt: string): Promise<any> {
    if (DISABLE_AI_COMPLETELY) {
        throw new Error('AI_CALL_BLOCKED');
    }
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

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini');

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(text);
}

/**
 * Extract brand and category from campaign HTML using AI
 */
export async function calculateMissingFields(
    rawHtml: string,
    extracted: any
): Promise<any> {
    const masterData = await fetchMasterData();

    const prompt = `Sen bir kampanya analiz asistanısın. Aşağıdaki HTML'den kampanyanın MARKA ve KATEGORİ bilgilerini çıkar.

KURALLAR:
1. MARKA: Kampanyada geçen mağaza/firma adı (örn: Teknosa, CarrefourSA, FG Europe, Türk Hava Yolları)
   - Banka adları (Akbank, Axess vb.) MARKA DEĞİLDİR
   - Kart adları (Axess, Bonus vb.) MARKA DEĞİLDİR
   - Eğer belirli bir marka yoksa null döndür
2. KATEGORİ: Aşağıdaki listeden EN UYGUN olanı seç:
   ${masterData.categories.join(', ')}

KAMPANYA BAŞLIĞI: ${extracted.title}

HTML İÇERİĞİ:
${rawHtml.substring(0, 2000)}

ÇIKTI FORMATI (sadece JSON döndür):
{
  "brand": "Marka Adı veya null",
  "category": "Kategori Adı"
}`;

    try {
        const result = await callGeminiAPI(prompt);

        // Normalize brand name
        if (result.brand && typeof result.brand === 'string') {
            const brandLower = result.brand.toLowerCase();
            const forbiddenTerms = ['akbank', 'axess', 'bonus', 'world', 'maximum', 'paraf', 'bankkart', 'wings', 'free', 'adios', 'play', 'crystal'];
            if (forbiddenTerms.some(term => brandLower.includes(term))) {
                result.brand = null;
            }
        }

        // Validate category
        if (result.category && !masterData.categories.includes(result.category)) {
            result.category = 'Diğer';
        }

        return {
            brand: result.brand || null,
            category: result.category || 'Diğer'
        };
    } catch (error: any) {
        console.error('   ❌ AI calculation error:', error.message);
        return {
            brand: null,
            category: 'Diğer'
        };
    }
}
