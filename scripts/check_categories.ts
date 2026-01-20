import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function check() {
    console.log('--- Categories ---');
    const { data: cats } = await supabase.from('categories').select('id, slug, name').limit(5);
    console.log(JSON.stringify(cats, null, 2));

    console.log('--- Sectors ---');
    const { data: secs } = await supabase.from('sectors').select('*').limit(5); // Select ALL to see if there is a uuid col
    console.log(JSON.stringify(secs, null, 2));
}
check();
