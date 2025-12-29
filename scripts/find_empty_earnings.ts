import { supabase } from '../src/utils/supabase';

/**
 * Find and fix campaigns with empty earning field
 */

async function findEmptyEarnings() {
    console.log('🔍 Boş earning alanına sahip kampanyaları arıyorum...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, earning, discount, description, category')
        .or('earning.is.null,earning.eq.')
        .order('id', { ascending: false })
        .limit(50);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`📊 ${campaigns.length} kampanya bulundu\n`);

    if (campaigns.length === 0) {
        console.log('✅ Tüm kampanyalarda earning alanı dolu!\n');
        return;
    }

    console.log('═'.repeat(60));
    console.log('BOŞ EARNING ALANI OLAN KAMPANYALAR');
    console.log('═'.repeat(60));

    campaigns.forEach((c, idx) => {
        console.log(`\n${idx + 1}. ID ${c.id}: ${c.title.substring(0, 60)}`);
        console.log(`   Earning: "${c.earning || 'BOŞ'}"`);
        console.log(`   Discount: "${c.discount || 'BOŞ'}"`);
        console.log(`   Category: ${c.category || 'YOK'}`);
        console.log(`   Description: ${c.description?.substring(0, 80) || 'YOK'}`);

        // Suggest earning based on discount or category
        let suggestion = '';
        if (c.discount && c.discount.includes('Taksit')) {
            suggestion = c.discount;
        } else if (c.category) {
            suggestion = 'Özel Fırsat';
        }

        if (suggestion) {
            console.log(`   💡 Öneri: "${suggestion}"`);
        }
    });

    console.log(`\n\n═'.repeat(60)`);
    console.log(`📋 TOPLAM: ${campaigns.length} kampanya`);
    console.log('═'.repeat(60));
    console.log('\n⚠️  Bu kampanyalar frontend\'de boş görünecek!');
    console.log('💡 Çözüm: fix_empty_earnings.ts scriptini çalıştır\n');
}

findEmptyEarnings()
    .then(() => {
        console.log('✨ Kontrol tamamlandı.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
