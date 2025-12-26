
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkCol() {
    console.log('🔍 Checking for participation_method column...');

    // Attempt to select it
    const { data, error } = await supabase
        .from('campaigns')
        .select('participation_method')
        .limit(1);

    if (error) {
        console.log('❌ Error:', error.message);
    } else {
        console.log('✅ Column participation_method exists!');
    }
}

checkCol();
