
import { supabase } from '../src/utils/supabase';

function slugify(text: string): string {
    const trMap: { [key: string]: string } = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
    };

    return text
        .replace(/[çğıöşüÇĞİÖŞÜ]/g, char => trMap[char])
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove symbols
        .trim()
        .replace(/\s+/g, '-') // Spaces to dashes
        .replace(/-+/g, '-'); // Merge multiple dashes
}

async function runBackfill() {
    console.log("Starting Slug Backfill...");

    // Fetch campaigns with NULL or empty slug
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, slug')
        .or('slug.is.null,slug.eq.""');

    if (error) {
        console.error("Error fetching campaigns:", error);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log("No campaigns found needing backfill.");
        return;
    }

    console.log(`Found ${campaigns.length} campaigns to update.`);

    let successCount = 0;
    let failCount = 0;

    for (const campaign of campaigns) {
        if (!campaign.title) continue;

        const newSlug = slugify(campaign.title);

        const { error: updateError } = await supabase
            .from('campaigns')
            .update({ slug: newSlug })
            .eq('id', campaign.id);

        if (updateError) {
            console.error(`Failed to update ID ${campaign.id}:`, updateError.message);
            failCount++;
        } else {
            successCount++;
            if (successCount % 50 === 0) process.stdout.write('.');
        }
    }

    console.log(`\nBackfill complete. Success: ${successCount}, Failed: ${failCount}`);
    process.exit(0);
}

runBackfill();
