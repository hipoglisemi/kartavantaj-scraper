import { supabase } from '../src/utils/supabase';

async function listMaximiles() {
    console.log('🔍 Listing Maximiles campaigns...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, image, image_url, image_migrated')
        .eq('card_name', 'Maximiles')
        .limit(10);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    data.forEach(c => {
        console.log(`\n📌 [${c.id}] ${c.title}`);
        console.log(`   - image: ${c.image}`);
        // console.log(`   - image_url: ${c.image_url}`);
        console.log(`   - image_migrated: ${c.image_migrated}`);
    });
}

listMaximiles().catch(console.error);
