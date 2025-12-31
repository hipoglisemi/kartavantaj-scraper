import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

/**
 * AI Optimization Helper: Filters campaigns to classify as New, Incomplete, or Complete
 * 
 * @param urls - Array of campaign URLs to check
 * @param cardName - Card name to filter by (e.g., 'Paraf', 'Wings')
 * @returns Object with lists of new and incomplete URLs to process
 */
export async function optimizeCampaigns(
    urls: string[],
    cardName: string
): Promise<{
    urlsToProcess: string[];
    stats: {
        total: number;
        new: number;
        incomplete: number;
        complete: number;
        blacklisted: number;
    }
}> {
    console.log(`   🔍 Checking for new and incomplete campaigns in database...`);

    // STEP 1: Blacklist Check (filter out blacklisted URLs)
    const { data: blacklistedData } = await supabase
        .from('campaign_blacklist')
        .select('url')
        .in('url', urls);

    const blacklistedUrls = new Set(blacklistedData?.map(b => b.url) || []);
    const cleanUrls = urls.filter(url => !blacklistedUrls.has(url));

    if (blacklistedUrls.size > 0) {
        console.log(`   🚫 Blacklist: ${blacklistedUrls.size} URLs atlandı`);
    }

    // STEP 2: Query database for existing campaigns (only clean URLs)
    const { data: existingCampaigns } = await supabase
        .from('campaigns')
        .select('reference_url, title, image, brand, sector_slug')
        .eq('card_name', cardName)
        .in('reference_url', cleanUrls);

    const existingMap = new Map(
        existingCampaigns?.map(c => [c.reference_url, c]) || []
    );

    const newUrls: string[] = [];
    const incompleteUrls: string[] = [];

    for (const url of cleanUrls) {
        const campaign = existingMap.get(url);

        if (!campaign) {
            // Case 1: Campaign does not exist -> NEW
            newUrls.push(url);
        } else {
            // Case 2: Campaign exists, check if data is incomplete
            const isImageMissing = !campaign.image || campaign.image.trim() === '' || campaign.image.includes('placeholder');
            const isBrandMissing = !campaign.brand; // Optional: Enforce brand check
            const isSectorGeneric = campaign.sector_slug === 'genel'; // Optional: Enforce sector check

            // You can customize this logic based on strictness
            if (isImageMissing || isBrandMissing) {
                // Log the reason for debugging
                const reason = [];
                if (isImageMissing) reason.push('image_missing');
                if (isBrandMissing) reason.push('brand_missing');
                // if (isSectorGeneric) reason.push('sector_generic');

                console.log(`      ⚠️  Incomplete (${reason.join(', ')}): ${url}`);
                incompleteUrls.push(url);
            }
        }
    }

    const urlsToProcess = [...newUrls, ...incompleteUrls];
    const completeCount = cleanUrls.length - urlsToProcess.length;

    const stats = {
        total: urls.length,
        new: newUrls.length,
        incomplete: incompleteUrls.length,
        complete: completeCount,
        blacklisted: blacklistedUrls.size
    };

    console.log(`   📊 Total: ${stats.total}, New: ${stats.new}, Incomplete: ${stats.incomplete}, Complete: ${stats.complete}`);

    if (completeCount > 0) {
        console.log(`   ⚡ Skipping ${stats.complete} complete campaigns...`);
    }

    if (urlsToProcess.length > 0) {
        console.log(`   🚀 Processing ${urlsToProcess.length} campaigns (${stats.new} new + ${stats.incomplete} incomplete)...`);
    }

    return { urlsToProcess, stats };
}
