import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkBankConfigs() {
    console.log('🔍 Checking bank_configs table...\n');

    const { data, error } = await supabase
        .from('bank_configs')
        .select('*')
        .eq('bank_id', 'akbank');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Akbank config:');
    console.log(JSON.stringify(data, null, 2));
}

checkBankConfigs();
