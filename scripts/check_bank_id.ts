
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkBank() {
    console.log('Fetching Yapı Kredi config...');
    const { data: ykb, error } = await supabase
        .from('bank_configs')
        .select('*')
        .ilike('bank_name', 'Yapı Kredi')
        .single();

    if (error) console.error(error);
    else console.log('YKB Config:', JSON.stringify(ykb, null, 2));

    console.log('\nFetching Akbank config (comparison)...');
    const { data: akb } = await supabase
        .from('bank_configs')
        .select('*')
        .ilike('bank_name', 'Akbank')
        .single();

    console.log('Akbank Config:', JSON.stringify(akb, null, 2));
}

checkBank();
