import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// Token tracking
let totalInputTokens = 0;
let totalOutputTokens = 0;
let apiCallCount = 0;

// Intercept Gemini API calls
const originalFetch = global.fetch;
(global as any).fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch.apply(global, args);

    // Check if this is a Gemini API call
    let url = '';
    const firstArg = args[0];
    if (typeof firstArg === 'string') {
        url = firstArg;
    } else if (firstArg instanceof Request) {
        url = firstArg.url;
    } else if (firstArg instanceof URL) {
        url = firstArg.href;
    }

    if (url.includes('generativelanguage.googleapis.com')) {
        apiCallCount++;

        // Clone response to read it
        const clonedResponse = response.clone();
        try {
            const data: any = await clonedResponse.json();

            // Extract token usage from Gemini response
            const usage = data.usageMetadata;
            if (usage) {
                totalInputTokens += usage.promptTokenCount || 0;
                totalOutputTokens += usage.candidatesTokenCount || 0;

                console.log(`\n📊 API Call #${apiCallCount}:`);
                console.log(`   Input: ${usage.promptTokenCount || 0} tokens`);
                console.log(`   Output: ${usage.candidatesTokenCount || 0} tokens`);
                console.log(`   Total so far: ${totalInputTokens + totalOutputTokens} tokens\n`);
            }
        } catch (e) {
            // Ignore JSON parse errors
        }
    }

    return response;
};

async function runTest() {
    console.log('🚀 Starting token tracking test with 5 campaigns...\n');

    // Directly run the scraper with limit
    process.argv.push('--ai', '--limit=1');

    // Import and run scraper
    await import('./scrapers/akbank/axess');

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TOKEN USAGE SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total API Calls: ${apiCallCount}`);
    console.log(`Total Input Tokens: ${totalInputTokens.toLocaleString()}`);
    console.log(`Total Output Tokens: ${totalOutputTokens.toLocaleString()}`);
    console.log(`Total Tokens: ${(totalInputTokens + totalOutputTokens).toLocaleString()}`);
    console.log(`\nAverage per campaign:`);

    const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
        console.log(`  - Campaigns processed: ${count}`);
        console.log(`  - Tokens per campaign: ${Math.round((totalInputTokens + totalOutputTokens) / count).toLocaleString()}`);
        console.log(`  - Input per campaign: ${Math.round(totalInputTokens / count).toLocaleString()}`);
        console.log(`  - Output per campaign: ${Math.round(totalOutputTokens / count).toLocaleString()}`);
    }

    console.log('='.repeat(80));
}

runTest();
