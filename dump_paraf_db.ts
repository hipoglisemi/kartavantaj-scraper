import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
async function dump() {
    const { data } = await supabase.from('campaigns').select('id, title, min_spend, earning, max_discount').eq('bank', 'Halkbank').order('id', {ascending: false});
    console.table(data);
}
dump();
