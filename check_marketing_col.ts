import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
async function check() {
    // Try to select marketing_text
    const { data, error } = await supabase.from('campaigns').select('marketing_text').limit(1);
    console.log('Error:', error);
}
check();
