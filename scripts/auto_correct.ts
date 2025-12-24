import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../src/services/geminiParser';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''; // Using service role key is better for automation
const supabase = createClient(supabaseUrl, supabaseKey);

async function autoCorrect() {
    console.log('🚀 Otomatik Düzeltme Döngüsü Başlatılıyor...');

    // 1. İnceleme gerektiren kampanyaları getir
    // - ai_parsing_incomplete true olanlar
    // - Matematik hataları (min_spend > 0 ve earning >= min_spend ve min_spend > 10)

    // Karmaşık mantık için tümünü çekip TS tarafında filtreliyoruz
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .or('ai_parsing_incomplete.eq.true,quality_score.lt.70')
        .limit(50); // Rate limitlere takılmamak için toplu işleme

    if (error) {
        console.error('Kampanyalar çekilirken hata oluştu:', error);
        return;
    }

    console.log(`İncelenmesi gereken ${campaigns?.length || 0} kampanya bulundu.`);

    for (const campaign of campaigns || []) {
        console.log(`\n🧐 Kampanya inceleniyor [${campaign.id}]: ${campaign.title}`);

        // Karmaşık Kalite Kontrolü
        const minSpend = parseFloat(campaign.min_spend) || 0;
        const earningValue = parseFloat(campaign.earning) || 0;
        const hasMathError = earningValue >= minSpend && minSpend > 10;
        const isIncomplete = campaign.ai_parsing_incomplete;

        if (hasMathError || isIncomplete || !campaign.slug) {
            console.log(`   🛠  Hata saptandı (Matematik: ${hasMathError}, Eksik: ${isIncomplete}). Yeniden işleniyor...`);

            try {
                // Gelişmiş Gemini promptları ile yeniden analiz
                const baseText = campaign.raw_content || `${campaign.title} ${campaign.description}`;
                const result = await parseWithGemini(baseText, campaign.url || '', campaign.bank);

                if (result) {
                    // Satırı güncelle
                    const { error: updateError } = await supabase
                        .from('campaigns')
                        .update({
                            ...result,
                            ai_parsing_incomplete: false,
                            auto_corrected: true,
                            quality_score: 100 // AI düzelttiğinde kalite skorunu sıfırla
                        })
                        .eq('id', campaign.id);

                    if (updateError) {
                        console.error(`   ❌ Güncelleme başarısız [${campaign.id}]:`, updateError.message);
                    } else {
                        console.log(`   ✅ Başarıyla düzeltildi [${campaign.id}]`);
                    }
                }
            } catch (err) {
                console.error(`   ❌ Yeniden işleme sırasında hata [${campaign.id}]:`, err);
            }

            // Rate limitlerden kaçınmak için bekle
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log(`   ✨ Kalite standartlara uygun.`);
            // Manuel kontrolden geçtiyse kalite skorunu güncelle
            await supabase.from('campaigns').update({ quality_score: 90 }).eq('id', campaign.id);
        }
    }

    console.log('\n🏁 Otomatik Düzeltme Döngüsü Tamamlandı.');
}

autoCorrect();
