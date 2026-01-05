
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

// Hardcoded creds
const supabase = createClient(
    'https://cppayemlaxblidgslfit.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwcGF5ZW1sYXhibGlkZ3NsZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDI5NzcsImV4cCI6MjA3NzMxODk3N30.kGDbguiboL1FPkpRSntdiKPAXtxNJMJ3FIcNixmCyME'
);

const GEMINI_KEY = 'AIzaSyD1x1haB-hrrakCH_4tI5ibU2vnQTR7NRA';
const TARGET_IDS = [18853, 18846, 18845, 18844, 18843]; // Add more if needed from the list
// Full list from previous step:
// 18853, 18846, 18845, 18844, 18843, 17529, 17528, 17527, 17526, 17525, 17524, 17523, 17522, 17521, 17520, 17519, 17518, 17517, 17516, 17515

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

async function fixSpecificCampaigns() {
    console.log(`🚀 Starting AI Fix Manual Mode...`);

    // Launch browser
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    // Get ALL relevant campaigns that are stuck
    // Combining the IDs we saw in the logs
    const idsToFix = [
        18853, 18846, 18845, 18844, 18843,
        17529, 17528, 17527, 17526, 17525,
        17524, 17523, 17522, 17521, 17520,
        17519, 17518, 17517, 17516, 17515
    ];

    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .in('id', idsToFix);

    if (!campaigns) {
        console.log('❌ No campaigns found');
        return;
    }

    console.log(`Processing ${campaigns.length} campaigns...`);

    for (const campaign of campaigns) {
        console.log(`\n🤖 Processing: [${campaign.id}] ${campaign.title}`);

        try {
            // 1. Fetch content
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.goto(campaign.reference_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            // Wait a bit for dynamic content
            await new Promise(r => setTimeout(r, 2000));
            const html = await page.content();
            await page.close();

            const cleanedText = cleanHtml(html);

            // 2. AI Parse
            const prompt = `
Extract campaign data into JSON for Akbank credit cards (Axess, Wings, Free, etc.).
Context: Bank=${campaign.bank}, Card=${campaign.card_name}
Text: "${cleanedText}"

Return JSON matching this schema:
{
  "description": "string (Short marketing summary 1-2 sentences)",
  "ai_marketing_text": "string (Punchy 5-10 words summary with emoji)",
  "min_spend": numberOrNull (Total spend required to get reward),
  "earning": "string (Reward description, e.g. '100 TL Chip-Para' or '%10 İndirim')",
  "valid_until": "YYYY-MM-DD string",
  "sector_id": null,
  "category": "string (One of: Market, Giyim, Elektronik, Akaryakıt, Restoran, E-Ticaret, Seyahat, Diğer)"
}
`;
            console.log('   🧠 Sending to Gemini...');
            const aiData = await callGemini(prompt);

            if (aiData) {
                // 3. Update DB
                const updateData = {
                    ...aiData,
                    ai_enhanced: true,
                    publish_updated_at: new Date().toISOString()
                };

                const { error } = await supabase
                    .from('campaigns')
                    .update(updateData)
                    .eq('id', campaign.id);

                if (error) console.error(`   ❌ Update failed: ${error.message}`);
                else console.log(`   ✅ Successfully updated! Earning: ${aiData.earning}`);
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

fixSpecificCampaigns();
