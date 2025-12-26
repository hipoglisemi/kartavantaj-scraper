// Uses global fetch (Node 18+)

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_KEY!;

/**
 * Enhances a campaign description using AI to make it more marketing-oriented.
 * Uses minimal tokens (~275) for cost efficiency.
 * 
 * @param rawDescription - The original description (usually just title)
 * @returns Enhanced marketing-style description with emojis (2 sentences max)
 */
export async function enhanceDescription(rawDescription: string): Promise<string> {
    if (!rawDescription || rawDescription.length < 10) {
        console.log('   ⚠️ Description too short, skipping enhancement');
        return rawDescription;
    }

    // Skip if already looks enhanced (has emojis)
    if (/[\u{1F300}-\u{1F9FF}]/u.test(rawDescription)) {
        console.log('   ℹ️ Description already has emojis, skipping');
        return rawDescription;
    }

    const prompt = `
Convert the following campaign description into a short, exciting, marketing-style summary (Max 2 sentences).
Use 1-2 relevant emojis (e.g. 🎉, ✈️, 🛍️).
Language: TURKISH.
RETURN ONLY THE ENHANCED TEXT, NO JSON, NO EXPLANATION.

Description: "${rawDescription}"
    `.trim();

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            }
        );

        if (!response.ok) {
            console.warn(`   ⚠️ Description enhancement failed (${response.status}), using original`);
            return rawDescription;
        }

        const data: any = await response.json();
        const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (enhanced && enhanced.length > 0) {
            console.log(`   ✨ Enhanced: ${enhanced.substring(0, 80)}...`);
            return enhanced;
        }

        return rawDescription;

    } catch (error: any) {
        console.error('   ❌ Description enhancement error:', error.message);
        return rawDescription; // Fallback to original
    }
}

/**
 * Batch enhance descriptions (for future optimization)
 */
export async function enhanceDescriptionsBatch(descriptions: string[]): Promise<string[]> {
    const enhanced: string[] = [];

    for (const desc of descriptions) {
        const result = await enhanceDescription(desc);
        enhanced.push(result);
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return enhanced;
}
