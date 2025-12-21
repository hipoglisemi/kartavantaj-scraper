import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkMasterData() {
    console.log('🔍 Checking master data in Supabase...\n');

    const [categoriesRes, brandsRes, banksRes] = await Promise.all([
        supabase.from('master_categories').select('name'),
        supabase.from('master_brands').select('name'),
        supabase.from('master_banks').select('name')
    ]);

    console.log('📊 Master Data Summary:');
    console.log('─'.repeat(50));
    console.log(`Categories: ${categoriesRes.data?.length || 0}`);
    console.log(`Brands: ${brandsRes.data?.length || 0}`);
    console.log(`Banks: ${banksRes.data?.length || 0}`);
    console.log('─'.repeat(50));

    if (categoriesRes.data) {
        console.log('\n📋 Categories:');
        categoriesRes.data.forEach((c, i) => {
            console.log(`${(i + 1).toString().padStart(2)}. ${c.name}`);
        });
    }

    if (categoriesRes.error) {
        console.error('\n❌ Categories error:', categoriesRes.error.message);
    }
    if (brandsRes.error) {
        console.error('❌ Brands error:', brandsRes.error.message);
    }
    if (banksRes.error) {
        console.error('❌ Banks error:', banksRes.error.message);
    }
}

checkMasterData();
