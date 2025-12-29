import { supabase } from '../src/utils/supabase';

async function checkCampaign() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', 14790)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Kampanya Detayları - ID 14790');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Başlık:', data.title);
    console.log('\n📊 Değerler:');
    console.log('   Earning:', data.earning || 'BOŞ');
    console.log('   Discount:', data.discount || 'BOŞ');
    console.log('   Min Spend:', data.min_spend || 'YOK');
    console.log('   Max Discount:', data.max_discount || 'YOK');

    console.log('\n📝 Açıklama:');
    console.log('  ', data.description || 'YOK');

    console.log('\n📜 Koşullar:');
    if (data.conditions && data.conditions.length > 0) {
        data.conditions.forEach((c: string, i: number) => {
            console.log(`   ${i + 1}. ${c}`);
        });
    } else {
        console.log('   YOK');
    }

    // Aralık tespiti
    const fullText = [data.title, data.description, ...(data.conditions || [])].join(' ');
    console.log('\n🔍 Aralık Analizi:');

    const patterns = [
        { name: 'Tire (-)', regex: /(\d+(?:\.\d+)?)\s*(?:tl)?\s*-\s*(\d+(?:\.\d+)?)\s*tl/gi },
        { name: 'Ve/İle', regex: /(\d+(?:\.\d+)?)\s*tl\s*(?:ve|ile)\s*(\d+(?:\.\d+)?)\s*tl/gi },
        { name: 'Arası', regex: /(\d+(?:\.\d+)?)\s*tl\s*(?:ve|ile)?\s*(\d+(?:\.\d+)?)\s*tl\s*aras/gi },
        { name: 'Min-Max', regex: /minimum\s*(\d+(?:\.\d+)?)\s*tl.*?maksimum\s*(\d+(?:\.\d+)?)\s*tl/gi }
    ];

    let found = false;
    patterns.forEach(p => {
        const matches = [...fullText.matchAll(p.regex)];
        if (matches.length > 0) {
            found = true;
            matches.forEach(match => {
                const min = parseFloat(match[1].replace(/\./g, ''));
                const max = parseFloat(match[2].replace(/\./g, ''));
                console.log(`\n   Pattern: ${p.name}`);
                console.log(`   Metin: "${match[0]}"`);
                console.log(`   Tespit: ${min} TL - ${max} TL`);

                if (data.min_spend === max) {
                    console.log(`   ❌ HATA: min_spend = ${data.min_spend} (MAX değer kullanılmış!)`);
                    console.log(`   ✅ DOĞRU: min_spend = ${min} olmalı`);
                } else if (data.min_spend === min) {
                    console.log(`   ✅ DOĞRU: min_spend doğru`);
                }
            });
        }
    });

    if (!found) {
        console.log('   Aralık pattern\'i bulunamadı.');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkCampaign()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
