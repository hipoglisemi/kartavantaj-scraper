import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function check() {
    const { data: cards } = await supabase.from('cards').select('*').eq('bank', 'Halkbank');
    console.log('Halkbank Cards:', cards);
    
    // Check normalize logic simulation
    const bank = 'Halkbank';
    const card = 'Paraf';
    console.log(`Checking for Bank: ${bank}, Card: ${card}`);
}
check();
