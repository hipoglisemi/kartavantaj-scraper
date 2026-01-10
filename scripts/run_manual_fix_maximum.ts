
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Use environment variables for security
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const GEMINI_KEY = process.env.GOOGLE_GEMINI_KEY;

async function callGemini(prompt: string) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1 }
            })
        }
    );
    const data: any = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
        // Remove markdown code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '');
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
    return null;
}

// Minimal cleaner
function cleanHtml(html: string) {
    return html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 30000);
}

async function fixMaximumCampaigns() {
    console.log(`🚀 Starting AI Fix Manual Mode for Maximum...`);

    // Launch browser
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    // 1. Fetch campaigns that need fixing
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'İş Bankası')
        .is('sector_slug', null)
        .order('created_at', { ascending: false })
        .limit(100); // Process 100 to finish all

    if (error) {
        console.error('Error fetching campaigns:', error);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No Maximum campaigns with missing sector found!');
        return;
    }

    console.log(`Processing ${campaigns.length} campaigns...`);

    for (const campaign of campaigns) {
        console.log(`\n🤖 Processing: [${campaign.id}] ${campaign.title}`);

        try {
            // 2. Fetch content
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Maximum URLs might need redirects, wait for network idle
            try {
                await page.goto(campaign.reference_url, { waitUntil: 'networkidle2', timeout: 30000 });
            } catch (pError) {
                console.log('   ⚠️ Page load warning (continuing):', pError);
            }

            const html = await page.content();
            await page.close();

            const cleanedText = cleanHtml(html);

            // 3. AI Parse
            const prompt = `
Extract campaign data into JSON for İş Bankası Maximum credit cards.
Context: Bank=İş Bankası, Card=${campaign.card_name}
Title: "${campaign.title}"
Text: "${cleanedText}"

Return JSON matching this schema:
{
  "description": "string (Short marketing summary 1-2 sentences)",
  "ai_marketing_text": "string (Punchy 5-10 words summary with emoji)",
  "min_spend": numberOrNull (Total spend required to get reward),
  "earning": "string (Reward description, e.g. '500 TL MaxiPuan' or 'Faizsiz Taksit')",
  "valid_until": "YYYY-MM-DD string",
  "category": "string (One of: Market, Giyim, Elektronik, Akaryakıt, Restoran, E-Ticaret, Seyahat, Diğer)",
  "brand": "string (The brand name if applicable, e.g. 'Trendyol', 'Migros', 'Shell'. If generic, use null)"
}
`;
            console.log('   🧠 Sending to Gemini...');
            const aiData = await callGemini(prompt);

            if (aiData) {
                // Map category to sector_slug
                const sectorMap: Record<string, string> = {
                    'Market': 'market',
                    'Giyim': 'giyim',
                    'Elektronik': 'elektronik',
                    'Akaryakıt': 'akaryakit',
                    'Restoran': 'restoran',
                    'E-Ticaret': 'e-ticaret',
                    'Seyahat': 'seyahat',
                    'Diğer': 'diger'
                };

                const sectorSlug = sectorMap[aiData.category] || 'diger';

                // 4. Update DB
                const updateData = {
                    ...aiData,
                    sector_slug: sectorSlug, // Explicitly set mapped slug
                    ai_enhanced: true,
                    publish_updated_at: new Date().toISOString()
                };

                // Remove helper field 'category' from update object as it might not be in DB cols or different
                delete updateData.category;

                const { error } = await supabase
                    .from('campaigns')
                    .update(updateData)
                    .eq('id', campaign.id);

                if (error) console.error(`   ❌ Update failed: ${error.message}`);
                else console.log(`   ✅ Successfully updated! Sector: ${sectorSlug}, Brand: ${aiData.brand}`);
            } else {
                console.log('   ⚠️ No data returned from AI');
            }

        } catch (e: any) {
            console.error(`   ❌ Error: ${e.message}`);
        }
    }

    await browser.close();
    console.log('\n✨ All done!');
}

fixMaximumCampaigns();
