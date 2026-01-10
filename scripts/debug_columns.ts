import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkColumns() {
    console.log('🔍 Checking campaign columns...');

    // Check columns from first row
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
        console.log('✅ Found columns:', columns.join(', '));

        console.log('\nChecking for expected columns:');
        console.log('- ai_processed:', columns.includes('ai_processed'));
        console.log('- keywords:', columns.includes('keywords'));
        console.log('- updated_at:', columns.includes('updated_at'));
        console.log('- publish_status:', columns.includes('publish_status'));
    } else {
        console.log('No data found to infer columns');
    }

    // Check valid publish_status values
    console.log('\nChecking publish_status values:');
    const { data: statusData } = await supabase
        .from('campaigns')
        .select('publish_status')
        .limit(50);

    if (statusData) {
        const statuses = [...new Set(statusData.map(s => s.publish_status))];
        console.log('Existing statuses:', statuses);
    }
}

checkColumns();
