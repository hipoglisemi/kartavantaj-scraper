import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkMasterBanks() {
    console.log('🔍 Checking `master_banks` table content...\n');

    const { data, error } = await supabase
        .from('master_banks')
        .select('*');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log('📊 master_banks rows:');
    data?.forEach(row => console.log(`- ${row.id}: ${row.name || row.bank_name} (Slug: ${row.slug || row.bank_id})`));
}

checkMasterBanks();
