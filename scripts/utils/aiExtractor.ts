/**
 * Extract missing min_spend and earning from campaign text using AI
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

interface ExtractedSpendEarning {
    min_spend?: number;
    earning?: string;
    discount_percentage?: number;
}

// Simple rate limiting
let lastCallTime = 0;
const MIN_INTERVAL = 1000; // 1 second between calls

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGeminiAPI(prompt: string): Promise<any> {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall < MIN_INTERVAL) {
        await sleep(MIN_INTERVAL - timeSinceLastCall);
    }

    lastCallTime = Date.now();

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_GEMINI_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 500
                }
            })
        }
    );

    const data: any = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    } catch {
        return {};
    }
}

export async function extractSpendAndEarning(campaign: any): Promise<ExtractedSpendEarning | null> {
    // Skip if both fields already exist
    if (campaign.min_spend && campaign.earning) {
        return null;
    }

    const text = `${campaign.title || ''}\n${campaign.description || ''}`.substring(0, 2000);

    if (!text.trim()) {
        return null;
    }

    const prompt = `
Kampanya metninden minimum harcama ve kazanç bilgilerini çıkar.

METIN:
"${text.replace(/"/g, '\\"')}"

Şu formatta JSON döndür:
{
  "min_spend": number (TL cinsinden minimum harcama, örn: 1000),
  "earning": string (kazanç açıklaması, örn: "100 TL Puan"),
  "discount_percentage": number (kazanç yüzdesi, örn: 10)
}

KURALLAR:
- "1000 TL harcamaya 100 TL puan" → min_spend: 1000, earning: "100 TL Puan", discount_percentage: 10
- "Her 500 TL'ye 50 TL" → min_spend: 500, earning: "50 TL Puan", discount_percentage: 10
- "%20 indirim" → earning: "%20 İndirim", discount_percentage: 20
- Eğer bilgi yoksa null döndür
- Sadece JSON döndür, açıklama yapma

JSON:`;

    try {
        const result = await callGeminiAPI(prompt);

        // Validate and return
        if (result.min_spend || result.earning) {
            return {
                min_spend: result.min_spend || undefined,
                earning: result.earning || undefined,
                discount_percentage: result.discount_percentage || undefined
            };
        }
    } catch (error: any) {
        console.error(`   ⚠️  AI extraction failed: ${error.message}`);
    }

    return null;
}
