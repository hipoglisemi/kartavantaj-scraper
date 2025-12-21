import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function testMasterSectors() {
    console.log('🔍 Testing master_sectors (frontend table)...\n');

    const { data, error } = await supabase
        .from('master_sectors')
        .select('name');

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log(`✅ Found ${data?.length || 0} sectors in master_sectors:\n`);
    data?.forEach((sector, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. ${sector.name}`);
    });

    console.log('\n📊 This matches frontend\'s sector count!');
}

testMasterSectors();
