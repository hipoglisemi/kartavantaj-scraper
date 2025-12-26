// check_bank_configs.ts
import { supabase } from './src/utils/supabase';

async function check() {
    const { data, error } = await supabase
        .from('bank_configs')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        process.exit(1);
    }

    console.log('Sample bank_configs row:');
    console.log(JSON.stringify(data, null, 2));
}

check();
