import { createClient } from '@supabase/supabase-js';
import { generateCampaignSlug } from '../src/utils/slugify';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function fixMissingSlugs() {
    console.log('🔧 Eksik Slug\'ları Düzeltme Başlıyor...\n');

    // Slug null veya boş olanları bul
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, slug')
        .or('slug.is.null,slug.eq.');

    if (error) {
        console.error('❌ Hata:', error);
        return;
    }

    console.log(`📊 Slug Eksik Kampanya Sayısı: ${campaigns?.length || 0}\n`);

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ Tüm kampanyalarda slug mevcut!');
        return;
    }

    let fixed = 0;
    let failed = 0;

    for (const campaign of campaigns) {
        try {
            const newSlug = generateCampaignSlug(campaign.title);

            const { error: updateError } = await supabase
                .from('campaigns')
                .update({ slug: newSlug })
                .eq('id', campaign.id);

            if (updateError) {
                console.log(`❌ [${campaign.id}] Hata: ${updateError.message}`);
                failed++;
            } else {
                console.log(`✅ [${campaign.id}] "${campaign.title.substring(0, 40)}..." → ${newSlug}`);
                fixed++;
            }
        } catch (e: any) {
            console.log(`❌ [${campaign.id}] Hata: ${e.message}`);
            failed++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 İşlem Tamamlandı!');
    console.log('='.repeat(60));
    console.log(`✅ Düzeltilen: ${fixed}`);
    console.log(`❌ Başarısız: ${failed}`);
}

fixMissingSlugs().catch(console.error);
