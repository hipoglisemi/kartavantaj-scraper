import { createClient } from '@supabase/supabase-js';
import { generateCampaignSlug } from '../src/utils/slugify';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function fixDuplicateSlugs() {
    console.log('🔧 Duplicate Slug\'ları ID ile Düzeltme...\n');

    // Hala slug null veya boş olanları bul
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, slug')
        .or('slug.is.null,slug.eq.');

    if (error) {
        console.error('❌ Hata:', error);
        return;
    }

    console.log(`📊 Kalan Eksik Slug: ${campaigns?.length || 0}\n`);

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ Tüm kampanyalarda slug mevcut!');
        return;
    }

    let fixed = 0;

    for (const campaign of campaigns) {
        // ID ile slug oluştur
        const newSlug = generateCampaignSlug(campaign.title, campaign.id);

        const { error: updateError } = await supabase
            .from('campaigns')
            .update({ slug: newSlug })
            .eq('id', campaign.id);

        if (updateError) {
            console.log(`❌ [${campaign.id}] Hata: ${updateError.message}`);
        } else {
            console.log(`✅ [${campaign.id}] "${campaign.title.substring(0, 40)}..." → ${newSlug}`);
            fixed++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Toplam Düzeltilen: ${fixed}`);
}

fixDuplicateSlugs().catch(console.error);
