
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkYKB() {
    const { data, error } = await supabase
        .from('bank_configs')
        .select('*')
        .ilike('bank_name', 'Yapı Kredi')
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('YKB Data:');
        console.log(`PK (id): ${data.id}`);
        console.log(`bank_id: "${data.bank_id}"`);
        console.log(`bank_name: "${data.bank_name}"`);
        console.log('Cards:', JSON.stringify(data.cards, null, 2));
    }
}

checkYKB();
