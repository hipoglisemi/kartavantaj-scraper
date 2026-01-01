import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function listWings() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('title, reference_url')
        .eq('bank', 'Akbank')
        .eq('card_name', 'Wings')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error:', error.message);
    } else {
        console.log(`📋 Found ${data.length} Wings campaigns in DB:`);
        data.forEach((c, i) => console.log(`${i + 1}. ${c.title}`));
    }
}

listWings();
