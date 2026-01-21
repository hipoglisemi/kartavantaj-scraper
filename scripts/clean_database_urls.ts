import { supabase } from '../src/utils/supabase';

async function cleanUrls() {
    console.log('🧹 Cleaning URLs in database (removing newlines)...');

    // 1. Find campaigns with newlines in image or image_url
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, image, image_url')
        .or('image.like.%\n%,image_url.like.%\n%');

    if (error) {
        console.error('❌ Error fetching campaigns:', error.message);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No campaigns found with newlines.');
        return;
    }

    console.log(`🧼 Found ${campaigns.length} campaigns to clean.`);

    for (const c of campaigns) {
        const cleanedImage = c.image ? c.image.replace(/\n/g, '').replace(/\r/g, '').trim() : c.image;
        const cleanedImageUrl = c.image_url ? c.image_url.replace(/\n/g, '').replace(/\r/g, '').trim() : c.image_url;

        console.log(`   ✨ Cleaning ID ${c.id}...`);

        const { error: updateError } = await supabase
            .from('campaigns')
            .update({
                image: cleanedImage,
                image_url: cleanedImageUrl
            })
            .eq('id', c.id);

        if (updateError) {
            console.error(`      ❌ Error updating ID ${c.id}:`, updateError.message);
        }
    }

    console.log('\n✅ Cleanup complete.');
}

cleanUrls().catch(console.error);
