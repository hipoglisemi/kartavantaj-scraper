import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function recordDailyStats() {
    console.log('🚀 Gelişmiş Günlük İstatistikler Kaydediliyor...');

    // 1. İstatistikleri Çek
    const { count: totalCount } = await supabase.from('campaigns').select('id', { count: 'exact', head: true });
    const { count: activeCount } = await supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('is_active', true);
    const { count: approvedCount } = await supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('is_approved', true);

    const { data: allData, error: fetchError } = await supabase
        .from('campaigns')
        .select('id, title, bank, brand, sector_slug, category, image, valid_until, ai_parsing_incomplete, min_spend, earning, description');

    if (fetchError || !allData) {
        console.error('❌ Veriler çekilemedi:', fetchError?.message);
        return;
    }

    const stats = {
        noBrand: 0,
        noSector: 0,
        noCategory: 0,
        noImage: 0,
        noValidUntil: 0,
        aiIncomplete: 0,
        mathErrors: 0,
        textMismatches: 0
    };

    const banks: Record<string, { total: number, missingBrand: number, missingSector: number, errors: number }> = {};

    allData.forEach(c => {
        // Temel Metaveri Kontrolleri
        const isGenericBrand = !c.brand || c.brand.trim() === '' || c.brand.toLowerCase().includes('genel');
        const isGenericSector = !c.sector_slug || c.sector_slug === 'diger';

        if (isGenericBrand) stats.noBrand++;
        if (isGenericSector) stats.noSector++;
        if (!c.category || c.category === 'Diğer') stats.noCategory++;
        if (!c.image || c.image === '') stats.noImage++;
        if (!c.valid_until) stats.noValidUntil++;
        if (c.ai_parsing_incomplete) stats.aiIncomplete++;

        // --- Gelişmiş Matematiksel Kontroller ---
        const minSpend = parseFloat(c.min_spend) || 0;
        const earning = parseFloat(c.earning) || 0;

        // Kazanım > Harcama durumu hata olarak işaretlenir (Örn: 50TL harcamaya 500TL puan)
        if (earning > 0 && minSpend > 0) {
            if (earning >= minSpend && minSpend > 10) {
                stats.mathErrors++;
            }
        }

        // --- Metin Uyuşmazlığı Kontrolleri ---
        const titleText = (c.title || '').toLowerCase();
        const descText = (c.description || '').toLowerCase();

        // Başlıktaki rakam ile earning alanı arasındaki büyük farkları kontrol et
        const numbersInTitle = titleText.match(/\d+/g) || [];
        if (numbersInTitle.includes(earning.toString()) === false && earning > 0) {
            const hasHighValueInTitle = numbersInTitle.some((n: string) => parseInt(n) >= 100);
            if (hasHighValueInTitle && earning < 10 && earning > 0) {
                stats.textMismatches++;
            }
        }

        // Banka bazlı kırılım
        if (!banks[c.bank]) banks[c.bank] = { total: 0, missingBrand: 0, missingSector: 0, errors: 0 };
        banks[c.bank].total++;
        if (isGenericBrand) banks[c.bank].missingBrand++;
        if (isGenericSector) banks[c.bank].missingSector++;
        if (c.ai_parsing_incomplete || (earning >= minSpend && minSpend > 10)) banks[c.bank].errors++;
    });

    // 2. Yükü Hazırla
    const payload = {
        total_campaigns: totalCount || 0,
        active_campaigns: activeCount || 0,
        approved_campaigns: approvedCount || 0,
        missing_brand_count: stats.noBrand,
        missing_sector_count: stats.noSector,
        missing_category_count: stats.noCategory,
        missing_image_count: stats.noImage,
        missing_date_count: stats.noValidUntil,
        ai_incomplete_count: stats.aiIncomplete,
        math_error_count: stats.mathErrors,
        text_mismatch_count: stats.textMismatches,
        bank_breakdown: banks,
        metadata: {
            run_date: new Date().toISOString(),
            engine_version: "2.0.0"
        }
    };

    // 3. Veritabanına Ekle
    const { error: insertError } = await supabase
        .from('system_statistics')
        .insert([payload]);

    if (insertError) {
        console.error('❌ İstatistikler kaydedilemedi:', insertError.message);
    } else {
        console.log('✅ Gelişmiş istatistikler başarıyla kaydedildi!');
    }
}

recordDailyStats().catch(err => console.error('❌ Uygulama Hatası:', err));
