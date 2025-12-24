import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../src/services/geminiParser';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEarningStandard() {
    console.log('🚀 Kazanç Standardı Düzeltme İşlemi Başlatılıyor...');

    // ID'leri buraya ekleyebilirsiniz (Örn: 11644, 11652, 8505)
    const targetIds = [8518, 8571, 8501, 8502];
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .in('id', targetIds);

    if (error) {
        console.error('Hata:', error);
        return;
    }

    console.log(`${campaigns?.length} potansiyel kampanya inceleniyor...`);

    let updateCount = 0;

    for (const campaign of campaigns || []) {
        const title = (campaign.title || '').toLowerCase();
        const desc = (campaign.description || '').toLowerCase();
        const earning = (campaign.earning || '').toLowerCase();
        const discount = (campaign.discount || '').toLowerCase();

        // Şüphe: Başlıkta taksit var ama earning/discount alanlarında taksit yok (veya ikisi aynı)
        const titleHasTaksit = title.includes('taksit');
        const fieldsHaveTaksit = earning.includes('taksit') || discount.includes('taksit');
        const titleHasPuanIndirim = title.includes('puan') || title.includes('chip') || title.includes('indirim') || title.includes('%');

        // For specific target IDs, we always want to run the fix
        const needsFix = targetIds.includes(campaign.id) || (titleHasTaksit && !fieldsHaveTaksit) || (earning === discount && earning !== '');

        if (needsFix) {
            console.log(`\n🛠  Düzeltiliyor [${campaign.id}]: ${campaign.title}`);
            console.log(`   Mevcut Earning: "${campaign.earning}", Discount: "${campaign.discount}"`);

            try {
                const baseText = campaign.raw_content || `${campaign.title} ${campaign.description}`;
                // YENİ KURALLARA GÖRE ANALİZ
                const result = await parseWithGemini(baseText, campaign.url || '', campaign.bank || '');

                console.log(`      🤖 AI Yanıtı [ID ${campaign.id}]:`, {
                    old_earning: campaign.earning,
                    old_discount: campaign.discount,
                    new_earning: result?.earning,
                    new_discount: result?.discount
                });

                if (result && (result.earning !== campaign.earning || result.discount !== campaign.discount)) {
                    console.log(`   ✨ Yeni Veri -> Earning: "${result.earning}", Discount: "${result.discount}"`);

                    const { error: updateError } = await supabase
                        .from('campaigns')
                        .update({
                            earning: result.earning,
                            discount: result.discount,
                            auto_corrected: true,
                            quality_score: 95
                        })
                        .eq('id', campaign.id);

                    if (!updateError) {
                        updateCount++;
                        console.log(`   ✅ Güncellendi.`);
                    } else {
                        console.error(`   ❌ Hata: ${updateError.message}`);
                    }
                }
            } catch (err) {
                console.error(`   ❌ AI Hatası:`, err);
            }

            // Rate limitler için kısa bekleme
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log(`\n🏁 İşlem Tamamlandı. ${updateCount} kampanya güncellendi.`);
}

fixEarningStandard();
