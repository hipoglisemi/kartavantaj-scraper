import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function list() {
    const { data, error } = await supabase.from('sectors').select('id, slug, name');
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}
list();
