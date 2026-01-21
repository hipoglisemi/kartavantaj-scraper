import { supabase } from '../src/utils/supabase';

async function inspectHiddenChars() {
    console.log('🔍 Inspecting hidden characters in URLs...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, image, image_url')
        .eq('card_name', 'Maximiles')
        .limit(10);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    data.forEach(c => {
        console.log(`\n📌 [${c.id}] ${c.title}`);
        console.log(`   - image: ${JSON.stringify(c.image)}`);
        console.log(`   - image_url: ${JSON.stringify(c.image_url)}`);
    });
}

inspectHiddenChars().catch(console.error);
