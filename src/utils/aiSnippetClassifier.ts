// AI Snippet Extractor
// Extracts minimal context (300-400 chars) for AI sector classification
// Reduces token usage by ~84% compared to full HTML

/**
 * Extract a concise snippet for AI classification
 * Includes title + first 300-350 chars of content
 */
export function extractSnippetForAI(title: string, content: string): string {
    // Clean content: remove extra whitespace
    const cleanContent = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim();

    // Title + snippet (max 400 chars total)
    const titlePart = title.trim();
    const maxContentLength = 350 - titlePart.length;
    const contentSnippet = cleanContent.substring(0, maxContentLength);

    const snippet = `${titlePart}\n\n${contentSnippet}`;

    // Ensure max 400 chars
    return snippet.substring(0, 400);
}

/**
 * Classify sector using minimal AI prompt (snippet-only)
 * Returns only sector_slug to minimize tokens
 */
export async function classifySectorWithAI(
    snippet: string,
    geminiApiKey: string
): Promise<{ sector_slug: string, confidence: number }> {
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

    const prompt = `Classify this Turkish credit card campaign into ONE sector.

Valid sectors (return slug only):
- market-gida
- akaryakit
- giyim-aksesuar
- restoran-kafe
- elektronik
- mobilya-dekorasyon
- kozmetik-saglik
- e-ticaret
- ulasim
- dijital-platform
- kultur-sanat
- egitim
- sigorta
- otomotiv
- vergi-kamu
- turizm-konaklama
- diger

Return ONLY the sector slug (e.g., "elektronik" or "market-gida" or "diger").
No explanation, no JSON, just the slug.

Campaign snippet:
${snippet}`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 20 // Very short response
                }
            })
        });

        if (!response.ok) {
            console.error('AI classification failed:', response.statusText);
            return { sector_slug: 'diger', confidence: 0.1 };
        }

        const data = await response.json();
        const sectorSlug = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() || 'diger';

        // Validate sector slug
        const validSlugs = [
            'market-gida', 'akaryakit', 'giyim-aksesuar', 'restoran-kafe',
            'elektronik', 'mobilya-dekorasyon', 'kozmetik-saglik', 'e-ticaret',
            'ulasim', 'dijital-platform', 'kultur-sanat', 'egitim',
            'sigorta', 'otomotiv', 'vergi-kamu', 'turizm-konaklama', 'diger'
        ];

        if (!validSlugs.includes(sectorSlug)) {
            console.warn(`Invalid sector slug from AI: "${sectorSlug}", using "diger"`);
            return { sector_slug: 'diger', confidence: 0.3 };
        }

        return {
            sector_slug: sectorSlug,
            confidence: sectorSlug === 'diger' ? 0.5 : 0.8
        };

    } catch (error) {
        console.error('AI classification error:', error);
        return { sector_slug: 'diger', confidence: 0.1 };
    }
}
