import { supabase } from '../src/utils/supabase';

async function check14661() {
    const { data } = await supabase
        .from('campaigns')
        .select('id, title, earning, min_spend, max_discount, description, conditions')
        .eq('id', 14661)
        .single();

    console.log('ID 14661 Detaylı Kontrol');
    console.log('═'.repeat(60));
    console.log('Başlık:', data.title);
    console.log('Earning:', data.earning);
    console.log('Min Spend:', data.min_spend);
    console.log('Max Discount:', data.max_discount);
    console.log('\nAçıklama:', data.description);
    console.log('\nKoşullar:');
    data.conditions?.forEach((c: string, i: number) => console.log(`  ${i + 1}. ${c}`));

    console.log('\n' + '═'.repeat(60));
    console.log('ANALİZ:');
    console.log('═'.repeat(60));
    console.log('Açıklama: "Her 3.000 TL ve üzeri harcamana 800 TL"');
    console.log('Toplam: 8.000 TL');
    console.log('\nHesaplama:');
    console.log('  Sefer başı kazanç: 800 TL');
    console.log('  Toplam kazanç: 8.000 TL');
    console.log('  Kaç sefer: 8.000 / 800 = 10 sefer');
    console.log('  Min harcama: 10 sefer × 3.000 TL = 30.000 TL');
    console.log('\n❌ HATA: 3.000 TL değil, 30.000 TL olmalı!');

    process.exit(0);
}

check14661().catch(console.error);
