import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

/**
 * AI Optimization Helper: Filters campaign URLs to only new ones
 * 
 * @param urls - Array of campaign URLs to check
 * @param cardName - Card name to filter by (e.g., 'Paraf', 'Wings')
 * @returns Object with filtered URLs and statistics
 */
export async function filterNewCampaigns(
    urls: string[],
    cardName: string
): Promise<{
    newUrls: string[];
    existingCount: number;
    newCount: number;
    totalCount: number;
}> {
    console.log(`   🔍 Checking for existing campaigns in database...`);

    // Query database for existing campaigns
    const { data: existingCampaigns } = await supabase
        .from('campaigns')
        .select('reference_url')
        .eq('card_name', cardName)
        .in('reference_url', urls);

    const existingUrls = new Set(
        existingCampaigns?.map(c => c.reference_url) || []
    );

    // Filter to only new URLs
    const newUrls = urls.filter(url => !existingUrls.has(url));

    const stats = {
        newUrls,
        existingCount: existingUrls.size,
        newCount: newUrls.length,
        totalCount: urls.length
    };

    console.log(`   📊 Total: ${stats.totalCount}, Existing: ${stats.existingCount}, New: ${stats.newCount}`);
    console.log(`   ⚡ Skipping ${stats.existingCount} existing campaigns, processing ${stats.newCount} new ones...`);

    return stats;
}
