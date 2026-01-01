import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function check() {
    const { data: cards, error } = await supabase.from('cards').select('id, name, bank');
    if(error) console.log(error);
    console.log('All Cards:', cards);
}
check();
