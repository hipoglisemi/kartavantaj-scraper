import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function check() {
    console.log('Checking Halkbank configuration...');
    
    // 1. Check Banks
    const { data: banks } = await supabase.from('banks').select('*').ilike('name', 'Halkbank');
    console.log('Banks:', banks);

    // 2. Check Cards
    const { data: cards } = await supabase.from('cards').select('*').ilike('name', 'Paraf%');
    console.log('Cards:', cards);
    
    // 3. Check Bank Configs
    const { data: configs } = await supabase.from('bank_configs').select('*').eq('bank_name', 'Halkbank');
    console.log('Configs:', configs);
}
check();
