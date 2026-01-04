import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkFinal() {
    console.log('🔍 Checking for İş Bankası campaigns with image_url...');
    const { data, error } = await supabase.from('campaigns')
        .select('id, title, image, image_url, created_at')
        .eq('bank', 'İş Bankası')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} campaigns. Details:`);
        data.forEach((c, i) => {
            console.log(`${i + 1}. ${c.title}`);
            console.log(`   Image_URL: ${c.image_url}`);
            console.log(`   Created: ${c.created_at}`);
        });

        const withImages = data.filter(c => c.image_url !== null);
        if (withImages.length > 0) {
            console.log(`\n✅ SUCCESS! ${withImages.length} campaigns have image_url populated.`);
        } else {
            console.log('\n⏳ No image_url found yet in the latest entries.');
        }
    } else {
        console.log('No İş Bankası campaigns found.');
    }
}
checkFinal();
