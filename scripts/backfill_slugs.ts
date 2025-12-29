import { supabase } from '../src/utils/supabase';
import { generateCampaignSlug } from '../src/utils/slugify';

async function backfillSlugs() {
    console.log('🚀 Starting slug backfill (Batched)...');

    // Fetch all campaigns that don't have a slug
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, slug')
        .is('slug', null);

    if (error) {
        console.error('❌ Error fetching campaigns:', error);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No campaigns missing slugs found.');
        return;
    }

    console.log(`📦 Found ${campaigns.length} campaigns missing slugs.`);

    const batchSize = 20;
    for (let i = 0; i < campaigns.length; i += batchSize) {
        const batch = campaigns.slice(i, i + batchSize);

        const updates = batch.map(campaign => {
            const newSlug = generateCampaignSlug(campaign.title, campaign.id);
            return supabase
                .from('campaigns')
                .update({ slug: newSlug })
                .eq('id', campaign.id);
        });

        await Promise.all(updates);
        console.log(`⏳ Progress: ${Math.min(i + batchSize, campaigns.length)}/${campaigns.length}...`);
    }

    console.log(`✅ Finished! Updated all campaigns.`);
}

backfillSlugs();
