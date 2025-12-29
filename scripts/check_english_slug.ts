
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkEnglishID() {
    console.log("Searching for bank_id = 'yapi-kredi'...");
    const { data, error } = await supabase
        .from('bank_configs')
        .select('*')
        .eq('bank_id', 'yapi-kredi'); // Exact match query

    if (error) console.error(error);
    else console.log('Found rows:', JSON.stringify(data, null, 2));
}

checkEnglishID();
