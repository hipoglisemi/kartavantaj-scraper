import { supabase } from '../src/utils/supabase';

(async () => {
    console.log('🔄 Konyalı Saat kampanyasını güncelliyorum...\n');

    const { data: campaign } = await supabase
        .from('campaigns')
        .select('id, title, sector_slug')
        .eq('card_id', 'ziraat-bankkart')
        .like('title', '%Konyalı%')
        .single();

    if (!campaign) {
        console.log('❌ Kampanya bulunamadı');
        return;
    }

    console.log('📋 Mevcut Durum:');
    console.log('   Başlık:', campaign.title);
    console.log('   Eski Sektör:', campaign.sector_slug);

    const { error } = await supabase
        .from('campaigns')
        .update({
            sector_slug: 'kuyum-optik-saat',
            category: 'Kuyum, Optik ve Saat'
        })
        .eq('id', campaign.id);

    if (error) {
        console.error('❌ Hata:', error);
        return;
    }

    console.log('\n✅ Kampanya güncellendi!');
    console.log('   Yeni Sektör: kuyum-optik-saat');
})();
