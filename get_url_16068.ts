import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function getUrl() {
    const { data } = await supabase.from('campaigns').select('url').eq('id', 16068).single();
    console.log(data?.url);
}
getUrl();
