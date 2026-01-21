import { supabase } from '../src/utils/supabase';

async function inspectCampaigns() {
    const titles = [
        'Amazon.com.tr\'de Peşin Fiyatına 6 Taksit Fırsatı!',
        'M.A.C Cosmetics Mağazalarında 300 TL MaxiPuan!',
        'Jo Malone London\'da 750 TL MaxiPuan!',
        'Zsa Zsa Zsu\'da Peşin Fiyatına 3 Taksit Fırsatı!'
    ];

    console.log('🔍 Inspecting specific campaigns...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, image, image_url, image_migrated, card_name')
        .in('title', titles);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('❓ No campaigns found with those titles.');
        return;
    }

    data.forEach(c => {
        console.log(`\n📌 Campaign: ${c.title} (${c.card_name})`);
        console.log(`   - image: ${c.image}`);
        console.log(`   - image_url: ${c.image_url}`);
        console.log(`   - image_migrated: ${c.image_migrated}`);
    });
}

inspectCampaigns().catch(console.error);
