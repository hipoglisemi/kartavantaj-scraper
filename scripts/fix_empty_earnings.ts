
import { supabase } from '../src/utils/supabase';
import { parseSurgical } from '../src/services/geminiParser';
import { syncEarningAndDiscount } from '../src/utils/dataFixer';

async function fixEmptyEarnings() {
    console.log('🔍 Boş kazanç alanına sahip kampanyalar taranıyor...');

    // EARNING, DISCOUNT veya BADGE_TEXT boş olan aktif kampanyaları bul
    const { data: campaigns, error: fetchError } = await supabase
        .from('campaigns')
        .select('id, title, description, conditions, category, bank, url, earning, discount, badge_text')
        .or('earning.is.null,earning.eq."",earning.eq."-",badge_text.is.null,badge_text.eq."-",badge_text.eq.""')
        .limit(50); // Batch size

    if (fetchError) {
        console.error('❌ Kampanyalar çekilirken hata:', fetchError.message);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ Düzelecek kampanya bulunamadı.');
        return;
    }

    console.log(`🚀 ${campaigns.length} kampanya düzeltilecek...`);

    for (const campaign of campaigns) {
        try {
            console.log(`   🛠  İşleniyor: "${campaign.title}" (${campaign.id})`);

            // Context için başlık ve açıklamayı birleştir
            const mockHtml = `
                <h1>${campaign.title}</h1>
                <p>${campaign.description}</p>
                <ul>${(campaign.conditions || []).map((c: string) => `<li>${c}</li>`).join('')}</ul>
            `;

            // Surgical Parse ile sadece earning ve discount alanlarını tekrar çek
            const fixedData = await parseSurgical(
                mockHtml,
                campaign,
                ['earning', 'discount'],
                campaign.url || '',
                campaign.bank
            );

            // Sync ile badge_text'i de güncelle
            const finalData = syncEarningAndDiscount(fixedData);

            // DB Güncelleme
            const { error: updateError } = await supabase
                .from('campaigns')
                .update({
                    earning: finalData.earning,
                    discount: finalData.discount,
                    badge_text: finalData.badge_text,
                    badge_color: finalData.badge_color,
                    auto_corrected: true
                })
                .eq('id', campaign.id);

            if (updateError) {
                console.error(`      ❌ Güncelleme hatası (${campaign.id}):`, updateError.message);
            } else {
                console.log(`      ✅ Başarıyla güncellendi: [${finalData.earning || finalData.discount || '-'}]`);
            }

        } catch (err) {
            console.error(`      💥 İşlem hatası (${campaign.id}):`, err);
        }
    }

    console.log('🏁 İşlem tamamlandı.');
}

fixEmptyEarnings();
