import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkMasterSchema() {
    console.log('🔍 Checking `master_banks` schema...\n');

    const { data, error } = await supabase
        .from('master_banks')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('📊 master_banks columns:');
        console.log(Object.keys(data[0]).join(', '));
        console.log('\n📋 Sample row:', data[0]);
    }
}

checkMasterSchema();
