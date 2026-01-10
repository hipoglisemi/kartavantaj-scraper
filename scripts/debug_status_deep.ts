import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkStatusDeep() {
    console.log('\nChecking for statuses NOT EQUAL to "processing"...');

    const { data: statusData, error } = await supabase
        .from('campaigns')
        .select('publish_status')
        .neq('publish_status', 'processing')
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (statusData && statusData.length > 0) {
        const statuses = [...new Set(statusData.map(s => s.publish_status))];
        console.log('✅ Found valid statuses:', statuses);
    } else {
        console.log('❌ No non-processing statuses found in the first results.');
    }
}

checkStatusDeep();
