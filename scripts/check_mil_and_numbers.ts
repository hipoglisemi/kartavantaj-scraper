import { supabase } from '../src/utils/supabase';

async function checkMilAndBigNumbers() {
    // 1. ID 14883 kontrol
    console.log('━'.repeat(60));
    console.log('1. ID 14883 - Mil Puan Kontrolü');
    console.log('━'.repeat(60));

    const { data: c1 } = await supabase
        .from('campaigns')
        .select('id, title, earning, description')
        .eq('id', 14883)
        .single();

    if (c1) {
        console.log('Başlık:', c1.title);
        console.log('Earning:', c1.earning);
        console.log('Açıklama:', c1.description?.substring(0, 150));

        if (c1.earning && c1.earning.includes('TL Puan') && c1.title.toLowerCase().includes('mil')) {
            console.log('\n⚠️  HATA: "Mil Puan" kampanyası "TL Puan" olarak işaretlenmiş!');
            console.log('✅ Doğru: "30000 Mil Puan" olmalı');
        }
    }

    // 2. Büyük sayılar kontrol
    console.log('\n' + '━'.repeat(60));
    console.log('2. Büyük Sayılar (10,000+) - Nokta Formatı Önerisi');
    console.log('━'.repeat(60));

    const { data: bigNumbers } = await supabase
        .from('campaigns')
        .select('id, title, earning, max_discount')
        .gte('max_discount', 10000)
        .order('max_discount', { ascending: false })
        .limit(15);

    if (bigNumbers) {
        bigNumbers.forEach(c => {
            console.log(`\nID ${c.id}: ${c.title.substring(0, 50)}`);
            console.log(`  Mevcut Earning: ${c.earning}`);
            console.log(`  Max Discount: ${c.max_discount?.toLocaleString('tr-TR')}`);

            // Noktalı format önerisi
            if (c.earning) {
                const match = c.earning.match(/(\d+)/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num >= 1000) {
                        const formatted = num.toLocaleString('tr-TR');
                        const newEarning = c.earning.replace(/(\d+)/, formatted);
                        console.log(`  💡 Noktalı: ${newEarning}`);
                    }
                }
            }
        });
    }

    console.log('\n' + '━'.repeat(60));
    console.log('📊 Nokta Kullanımı Hakkında');
    console.log('━'.repeat(60));
    console.log('\n✅ AVANTAJLAR:');
    console.log('   - Okunabilirlik: "30.000 TL" > "30000 TL"');
    console.log('   - Profesyonel görünüm');
    console.log('   - Kullanıcı deneyimi');

    console.log('\n❌ DİSAVANTAJLAR:');
    console.log('   - Parsing zorluğu (regex daha karmaşık)');
    console.log('   - Tutarsızlık riski (bazı yerlerde noktalı, bazı yerlerde noktasız)');
    console.log('   - String comparison sorunları');

    console.log('\n💡 ÖNERİ:');
    console.log('   Frontend\'de display için nokta ekle, database\'de noktasız tut.');
    console.log('   Örnek: earning="30000 TL Puan" → Display: "30.000 TL Puan"');
}

checkMilAndBigNumbers()
    .then(() => {
        console.log('\n✨ Kontrol tamamlandı.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
