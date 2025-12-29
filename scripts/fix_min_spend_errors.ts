import { supabase } from '../src/utils/supabase';

async function fixMinSpendErrors() {
    console.log('🔧 min_spend hatalarını düzeltiyorum...\n');

    // ID 14661: 30.000 TL olmalı
    const { error: e1 } = await supabase
        .from('campaigns')
        .update({ min_spend: 30000 })
        .eq('id', 14661);

    if (e1) {
        console.error('❌ ID 14661 Error:', e1);
    } else {
        console.log('✅ ID 14661: min_spend = 3.000 TL → 30.000 TL');
    }

    // ID 14674'ü kontrol et
    const { data } = await supabase
        .from('campaigns')
        .select('id, title, earning, min_spend, max_discount, description')
        .eq('id', 14674)
        .single();

    console.log('\n━'.repeat(60));
    console.log('ID 14674 Kontrol:');
    console.log('Başlık:', data.title);
    console.log('Açıklama:', data.description?.substring(0, 150));
    console.log('Min Spend:', data.min_spend);
    console.log('Max Discount:', data.max_discount);

    console.log('\nHesaplama:');
    console.log('  "500 TL ve üzeri harcamana 300 TL, toplamda 1.200 TL"');
    console.log('  Sefer başı: 300 TL');
    console.log('  Toplam: 1.200 TL');
    console.log('  Kaç sefer: 1.200 / 300 = 4 sefer');
    console.log('  Min harcama: 4 × 500 = 2.000 TL');

    // ID 14674: 2.000 TL olmalı
    const { error: e2 } = await supabase
        .from('campaigns')
        .update({ min_spend: 2000 })
        .eq('id', 14674);

    if (e2) {
        console.error('\n❌ ID 14674 Error:', e2);
    } else {
        console.log('\n✅ ID 14674: min_spend = 500 TL → 2.000 TL');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Düzeltmeler tamamlandı!');
    console.log('═'.repeat(60));
}

fixMinSpendErrors()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
