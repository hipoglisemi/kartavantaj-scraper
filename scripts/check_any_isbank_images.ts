import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkAny() {
    console.log('🔍 Checking for ANY İş Bankası campaigns with image_url...');
    const { data, error } = await supabase.from('campaigns')
        .select('id, title, image_url, created_at')
        .eq('bank', 'İş Bankası')
        .not('image_url', 'is', null);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`✅ SUCCESS: Found ${data.length} campaigns with image_url populated.`);
        data.forEach(c => console.log(`- ${c.title} (${c.image_url})`));
    } else {
        console.log('❌ Still no campaigns with image_url found.');
    }
}
checkAny();
