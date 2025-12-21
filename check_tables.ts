import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function listAllTables() {
    console.log('🔍 Checking all available tables in Supabase...\n');

    // Try different possible table names
    const possibleTables = [
        'sectors',
        'master_sectors',
        'categories',
        'master_categories',
        'brands',
        'master_brands',
        'banks',
        'master_banks'
    ];

    for (const tableName of possibleTables) {
        const { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

        if (!error) {
            console.log(`✅ ${tableName.padEnd(20)} - ${count} rows`);
        } else {
            console.log(`❌ ${tableName.padEnd(20)} - ${error.message}`);
        }
    }

    console.log('\n📋 Checking actual data from working tables:\n');

    // Check master_categories content
    const { data: cats } = await supabase.from('master_categories').select('*').limit(5);
    if (cats) {
        console.log('master_categories sample:');
        console.log(cats);
    }

    // Check master_brands content
    const { data: brands } = await supabase.from('master_brands').select('*').limit(5);
    if (brands) {
        console.log('\nmaster_brands sample:');
        console.log(brands);
    }
}

listAllTables();
