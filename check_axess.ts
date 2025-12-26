import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAxess() {
    console.log('🔍 Checking for Axess card in cards table...');
    const { data, error } = await supabase.from('cards').select('*').eq('slug', 'axess').single();
    if (error) {
        console.error('❌ Error:', error.message);
    } else {
        console.log('✅ Found Axess card:', data);
    }
}

checkAxess().catch(console.error);
