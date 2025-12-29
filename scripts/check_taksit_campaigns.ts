import { supabase } from '../src/utils/supabase';

async function checkTaksitCampaigns() {
    console.log('🔍 Taksit kampanyalarını kontrol ediyorum...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, earning, discount, min_spend, max_discount, description, conditions')
        .or('discount.ilike.%taksit%,earning.ilike.%taksit%')
        .order('id', { ascending: false })
        .limit(30);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`📊 Toplam ${campaigns.length} taksit kampanyası bulundu\n`);

    campaigns.forEach(c => {
        console.log('━'.repeat(60));
        console.log(`ID ${c.id}: ${c.title}`);
        console.log(`\n📊 Değerler:`);
        console.log(`   Earning: ${c.earning || 'BOŞ'}`);
        console.log(`   Discount: ${c.discount || 'BOŞ'}`);
        console.log(`   Min Spend: ${c.min_spend || 'YOK'}`);
        console.log(`   Max Discount: ${c.max_discount || 'YOK'}`);

        console.log(`\n📝 Açıklama:`);
        console.log(`   ${c.description?.substring(0, 200) || 'YOK'}`);

        // Check for range pattern
        const desc = (c.title + ' ' + (c.description || '')).toLowerCase();
        const rangeMatch = desc.match(/(\d+(?:\.\d+)?)\s*(?:tl)?\s*(?:-|ve|ile)\s*(\d+(?:\.\d+)?)\s*tl/);

        if (rangeMatch) {
            const minAmount = parseFloat(rangeMatch[1].replace('.', ''));
            const maxAmount = parseFloat(rangeMatch[2].replace('.', ''));

            console.log(`\n⚠️  ARALIK TESPİT EDİLDİ: ${minAmount} TL - ${maxAmount} TL`);

            if (c.min_spend) {
                if (c.min_spend === maxAmount) {
                    console.log(`   ❌ HATA: min_spend = ${c.min_spend} (MAX değer kullanılmış!)`);
                    console.log(`   ✅ DOĞRU: min_spend = ${minAmount} olmalı`);
                } else if (c.min_spend === minAmount) {
                    console.log(`   ✅ DOĞRU: min_spend = ${c.min_spend}`);
                } else {
                    console.log(`   ⚠️  min_spend = ${c.min_spend} (beklenen: ${minAmount})`);
                }
            }
        }

        console.log('');
    });
}

checkTaksitCampaigns()
    .then(() => {
        console.log('✨ Kontrol tamamlandı.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
