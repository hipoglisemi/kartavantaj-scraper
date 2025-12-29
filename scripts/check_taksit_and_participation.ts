import { supabase } from '../src/utils/supabase';

/**
 * Check for two issues:
 * 1. Earning = "Taksit" (should be "X Taksit")
 * 2. participation_method = "Juzdan'ı indirin" (should be proper instruction)
 */

async function checkTaksitAndParticipation() {
    console.log('🔍 Kontrol ediliyor...\n');

    // 1. Check earning = "Taksit" only
    console.log('═'.repeat(60));
    console.log('1. EARNING = "Taksit" HATASI');
    console.log('═'.repeat(60));

    const { data: taksitOnly } = await supabase
        .from('campaigns')
        .select('id, title, earning, discount')
        .eq('earning', 'Taksit')
        .order('id', { ascending: false });

    if (taksitOnly && taksitOnly.length > 0) {
        console.log(`\n❌ ${taksitOnly.length} kampanya bulundu:\n`);
        taksitOnly.forEach((c, idx) => {
            console.log(`${idx + 1}. ID ${c.id}: ${c.title.substring(0, 60)}`);
            console.log(`   Earning: "${c.earning}"`);
            console.log(`   Discount: "${c.discount}"`);

            if (c.discount && c.discount.includes('Taksit')) {
                console.log(`   💡 Öneri: earning = "${c.discount}"`);
            } else {
                console.log(`   ⚠️  Discount bilgisi yok, manuel kontrol gerekli`);
            }
            console.log('');
        });
    } else {
        console.log('\n✅ Earning = "Taksit" hatası yok\n');
    }

    // 2. Check participation_method issues
    console.log('\n' + '═'.repeat(60));
    console.log('2. KATILIM ŞEKLİ HATALARI');
    console.log('═'.repeat(60));

    const { data: badParticipation } = await supabase
        .from('campaigns')
        .select('id, title, participation_method')
        .or('participation_method.ilike.%indirin%,participation_method.ilike.%yükleyin%,participation_method.ilike.%uygulama%')
        .order('id', { ascending: false })
        .limit(50);

    if (badParticipation && badParticipation.length > 0) {
        console.log(`\n⚠️  ${badParticipation.length} kampanya kontrol edilmeli:\n`);

        const issues: any[] = [];

        badParticipation.forEach((c) => {
            const pm = c.participation_method?.toLowerCase() || '';

            // Check for bad patterns
            if (pm.includes('indirin') || pm.includes('yükleyin') ||
                (pm.includes('uygulama') && !pm.includes('hemen katıl'))) {
                issues.push(c);
            }
        });

        if (issues.length > 0) {
            console.log(`❌ ${issues.length} kampanyada sorunlu katılım metni:\n`);
            issues.forEach((c, idx) => {
                console.log(`${idx + 1}. ID ${c.id}: ${c.title.substring(0, 50)}`);
                console.log(`   Mevcut: "${c.participation_method}"`);
                console.log(`   💡 Öneri: "Harcamadan önce Juzdan'dan 'Hemen Katıl' butonuna tıklayın."`);
                console.log('');
            });
        } else {
            console.log('✅ Sorunlu katılım metni bulunamadı\n');
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 ÖZET');
    console.log('═'.repeat(60));
    console.log(`Earning "Taksit": ${taksitOnly?.length || 0} kampanya`);
    console.log(`Sorunlu katılım: ${badParticipation?.filter(c => {
        const pm = c.participation_method?.toLowerCase() || '';
        return pm.includes('indirin') || pm.includes('yükleyin') ||
            (pm.includes('uygulama') && !pm.includes('hemen katıl'));
    }).length || 0} kampanya`);
}

checkTaksitAndParticipation()
    .then(() => {
        console.log('\n✨ Kontrol tamamlandı.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
