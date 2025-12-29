import { supabase } from '../src/utils/supabase';

async function checkSpecificCampaigns() {
    const ids = [14667, 14827, 14557];

    const { data } = await supabase
        .from('campaigns')
        .select('id, title, category, brand, merchant, description')
        .in('id', ids)
        .order('id', { ascending: false });

    if (!data) return;

    console.log('═'.repeat(60));
    console.log('DİĞER KATEGORİSİNE DÜŞEN KAMPANYALAR');
    console.log('═'.repeat(60));

    data.forEach((c, i) => {
        console.log(`\n${i + 1}. ID ${c.id}: ${c.title}`);
        console.log(`   Kategori: ${c.category}`);
        console.log(`   Merchant: ${c.merchant || 'YOK'}`);
        console.log(`   Brand: ${JSON.stringify(c.brand)}`);
        console.log(`   Açıklama: ${c.description?.substring(0, 150)}`);

        // Suggest category
        const desc = (c.title + ' ' + (c.description || '')).toLowerCase();
        let suggestedCategory = '';

        if (desc.includes('nespresso') || desc.includes('kahve')) {
            suggestedCategory = 'Elektronik veya Market & Gıda';
        } else if (desc.includes('karaca')) {
            suggestedCategory = 'Mobilya & Dekorasyon';
        } else if (desc.includes('enplus') || desc.includes('teknosa')) {
            suggestedCategory = 'Elektronik';
        }

        if (suggestedCategory) {
            console.log(`   💡 Önerilen: ${suggestedCategory}`);
        }
    });

    process.exit(0);
}

checkSpecificCampaigns().catch(console.error);
