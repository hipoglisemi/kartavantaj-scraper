import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkConnection() {
    console.log('Testing Supabase connection...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, bank_id, created_at')
        .order('id', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Latest 5 campaigns:');
        console.table(data);
    }
}

checkConnection();
