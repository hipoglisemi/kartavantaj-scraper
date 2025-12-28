
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkTriggers() {
    console.log('🔍 Checking triggers on campaigns table...');

    const { data, error } = await supabase.rpc('inspect_triggers', { table_name: 'campaigns' });

    if (error) {
        // If RPC doesn't exist, try a direct query via SQL (if enabled)
        // Since I can't run raw SQL easily without a specific RPC, I'll try to check the schema info.
        console.error('❌ Error calling inspect_triggers. It might not exist.');

        // Alternative: Try to fetch a list of all RPCs to see if there's a schema inspector
        const { data: functions } = await supabase.rpc('get_functions');
        console.log('Available functions:', functions?.map((f: any) => f.name));
    } else {
        console.log('Triggers:', data);
    }
}

checkTriggers();
