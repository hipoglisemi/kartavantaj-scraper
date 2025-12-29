import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../src/services/geminiParser';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''; // Using service role key is better for automation
const supabase = createClient(supabaseUrl, supabaseKey);

async function autoCorrect() {
    console.log('🚀 Otomatik Düzeltme Döngüsü Başlatılıyor...');

    // 1. İnceleme gerektiren veya geliştirilmeye açık kampanyaları getir
    // - ai_parsing_incomplete true olanlar
    // - Kalite skoru düşük olanlar
    // - Earning ve discount alanları kirli/temizlenmesi gerekenler
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .or('ai_parsing_incomplete.eq.true,quality_score.lt.70,earning.eq.-,earning.is.null,badge_text.eq.-,badge_text.is.null,category.eq.Diğer')
        .order('id', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Kampanyalar çekilirken hata oluştu:', error);
        return;
    }

    console.log(`İncelenmesi gereken ${campaigns?.length || 0} kampanya bulundu.`);

    for (const campaign of campaigns || []) {
        console.log(`\n🧐 Kampanya inceleniyor [${campaign.id}]: ${campaign.title}`);

        const mathFlags = campaign.math_flags || [];
        const hasMathError = mathFlags.length > 0;
        const isIncomplete = campaign.ai_parsing_incomplete;
        const aiSuggestedMath = campaign.ai_suggested_math;
        const aiSuggestedDates = campaign.ai_suggested_valid_until;

        if (hasMathError || isIncomplete || aiSuggestedMath || aiSuggestedDates || !campaign.slug) {
            console.log(`   🛠  İşlem gereksinimi saptandı (Matematik Bayrağı: ${hasMathError}, Eksik: ${isIncomplete}, AI Önerisi: ${!!aiSuggestedMath}).`);

            try {
                let updateData: any = {
                    auto_corrected: true,
                    ai_parsing_incomplete: false,
                    quality_score: 100
                };

                // SUGGEST-ONLY MERGE POLICY (Phase 8)
                if (aiSuggestedMath) {
                    console.log('   🤖 AI Math Referee önerileri uygulanıyor (Suggest-Only)...');
                    // AI suggestions only fill missing or flagged deterministic fields
                    if (mathFlags.includes('spend_zero_with_signals') || campaign.min_spend === 0) {
                        updateData.min_spend = aiSuggestedMath.min_spend;
                    }
                    if (!campaign.earning || mathFlags.includes('reward_le_spend_collision')) {
                        updateData.earning = aiSuggestedMath.earning;
                        updateData.max_discount = aiSuggestedMath.max_discount;
                        updateData.discount_percentage = aiSuggestedMath.discount_percentage;
                    }
                    // Clear the suggestion once applied/evaluated
                    updateData.ai_suggested_math = null;
                    updateData.math_flags = [];
                }

                if (aiSuggestedDates && !campaign.valid_until) {
                    console.log('   📅 AI Date Referee önerisi uygulanıyor...');
                    updateData.valid_until = aiSuggestedDates;
                    updateData.ai_suggested_valid_until = null;
                }

                // If still incomplete, missing earnings, or missing slug, do targeted surgical parse
                if ((isIncomplete && !aiSuggestedMath) || !campaign.slug || !campaign.earning || campaign.earning === '-') {
                    console.log('   🔄 Cerrahi (Surgical) iyileştirme gerekiyor...');
                    const baseText = campaign.raw_content || `${campaign.title} ${campaign.description} ${campaign.conditions?.join(' ')}`;

                    // Determine which fields are actually missing/bad
                    const fieldsToFix = [];
                    if (!campaign.earning || campaign.earning === '-') fieldsToFix.push('earning');
                    if (!campaign.category || campaign.category === 'Diğer') fieldsToFix.push('category');
                    if (!campaign.valid_until) fieldsToFix.push('valid_until');

                    if (fieldsToFix.length > 0) {
                        const result = await parseSurgical(baseText, campaign, fieldsToFix, campaign.url || '', campaign.bank);
                        if (result) {
                            // Badge re-assignment is handled by syncEarningAndDiscount inside surgical if needed, 
                            // but let's be explicit
                            updateData = { ...updateData, ...result };
                        }
                    }
                }

                // Satırı güncelle
                const { error: updateError } = await supabase
                    .from('campaigns')
                    .update(updateData)
                    .eq('id', campaign.id);

                if (updateError) {
                    console.error(`   ❌ Güncelleme başarısız [${campaign.id}]:`, updateError.message);
                } else {
                    console.log(`   ✅ Başarıyla işlendi/düzeltildi [${campaign.id}]`);
                }
            } catch (err) {
                console.error(`   ❌ İşlem sırasında hata [${campaign.id}]:`, err);
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
