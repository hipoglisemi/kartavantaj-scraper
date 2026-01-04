import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkRecent() {
    console.log('🔍 Listing 10 most recent campaigns in DB...');
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, reference_url, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        data.forEach((c, i) => {
            console.log(`${i + 1}. [${c.bank}] ${c.title}`);
            console.log(`   URL: ${c.reference_url}`);
            console.log(`   Image: ${c.image_url}`);
            console.log(`   Created: ${c.created_at}`);
        });
    } else {
        console.log('No recent campaigns found');
    }
}
checkRecent();
