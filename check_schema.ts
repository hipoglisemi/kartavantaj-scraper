import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function check() {
    // 1. Check a valid Akbank campaign FK
    const { data: akbank } = await supabase.from('campaigns').select('bank_id').eq('bank', 'Akbank').limit(1).single();
    if (akbank) console.log('Valid Akbank FK:', akbank.bank_id);
    
    // 2. See if that ID exists in 'banks' or 'master_banks'
    if (akbank?.bank_id) {
        const { data: b1 } = await supabase.from('banks').select('id, name').eq('id', akbank.bank_id);
        const { data: b2 } = await supabase.from('master_banks').select('id, name').eq('id', akbank.bank_id);
        console.log('In "banks":', b1);
        console.log('In "master_banks":', b2);
    }

    // 3. List all master_banks to find Halkbank there
    const { data: masters } = await supabase.from('master_banks').select('id, name');
    console.log('Master Banks List:', masters);
}
check();
