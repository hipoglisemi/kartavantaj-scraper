
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkColumns() {
    console.log('🔍 Checking campaign columns via error detection...');

    // Try to select the 'join_method' column. If it fails, it doesn't exist.
    const { data, error } = await supabase
        .from('campaigns')
        .select('join_method')
        .limit(1);

    if (error) {
        console.log('❌ Column join_method validation failed:', error.message);
        if (error.message.includes('does not exist')) {
            console.log('💡 Confirmed: Column is missing.');
        }
    } else {
        console.log('✅ Column join_method exists!');
    }

    // Check card_id
    const { data: d2, error: e2 } = await supabase
        .from('campaigns')
        .select('card_id')
        .limit(1);

    if (e2) {
        console.log('❌ Column card_id validation failed:', e2.message);
    } else {
        console.log('✅ Column card_id exists!');
    }
}

checkColumns();
