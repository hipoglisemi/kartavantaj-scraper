// check_supabase_columns.ts
import { supabase } from './src/utils/supabase';

async function check() {
    // Try to select the new columns
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, bank_id, card_id, brand_id, sector_id, slug')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error.message);
        console.error('   Hint:', error.hint);
        process.exit(1);
    }

    console.log('✅ New columns exist in Supabase!');
    console.log('Sample row:', JSON.stringify(data, null, 2));
}

check();
