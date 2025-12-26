
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function inspectColumns() {
    console.log('🔍 Inspecting campaigns table columns...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log('✅ Found columns:');
        console.log(columns.sort().join('\n'));
    } else {
        console.log('⚠️ No data found to inspect columns.');
    }
}

inspectColumns();
