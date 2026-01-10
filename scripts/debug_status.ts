import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkStatus() {
    console.log('\nChecking publish_status values (distinct):');

    try {
        const { data: statusData, error } = await supabase
            .from('campaigns')
            .select('publish_status')
            .limit(100);

        if (error) {
            console.error('Error fetching statuses:', error);
            return;
        }

        if (statusData) {
            const statuses = [...new Set(statusData.map(s => s.publish_status))];
            console.log('Existing statuses found:', statuses);
        } else {
            console.log('No data found.');
        }

    } catch (e) {
        console.error("Exception:", e);
    }
}

checkStatus();
