
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateSectorSlug } from './utils/slugify';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function fixExistingData() {
    console.log('🔧 Starting bulk fix for missing sector_slugs...\n');

    // 1. Fetch campaigns that need fixing
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, category, title')
        .or('sector_slug.is.null,sector_slug.eq.""');

    if (error) {
        console.error('❌ Error fetching campaigns:', error.message);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No campaigns need fixing.');
        return;
    }

    console.log(`📡 Found ${campaigns.length} campaigns to fix.`);

    let successCount = 0;
    for (const campaign of campaigns) {
        const category = campaign.category || 'Diğer';
        const slug = generateSectorSlug(category);

        const { error: updateError } = await supabase
            .from('campaigns')
            .update({
                category: category, // Ensure category is also set if it was null
                sector_slug: slug
            })
            .eq('id', campaign.id);

        if (updateError) {
            console.error(`   ❌ Failed to fix ID ${campaign.id}:`, updateError.message);
        } else {
            successCount++;
        }
    }

    console.log(`\n🎉 Successfully fixed ${successCount} campaigns.`);
}

fixExistingData();
