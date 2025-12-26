import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMasterBanks() {
    console.log('🔍 checking master_banks columns...');
    const { data, error } = await supabase.from('master_banks').select('*').limit(1);
    if (error) {
        console.error('❌ Error:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample:', data[0]);
    }
}

checkMasterBanks().catch(console.error);
