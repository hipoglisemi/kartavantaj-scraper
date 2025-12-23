import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function check() {
    const { data, error } = await supabase.from('campaigns').select('*').limit(1);
    if (error) {
        console.error('Error fetching record:', error);
        return;
    }
    if (data && data.length > 0) {
        console.log('--- Sample Record ---');
        console.log(JSON.stringify(data[0], null, 2));

        console.log('\n--- Column Status (Null Check) ---');
        const record = data[0];
        Object.keys(record).forEach(key => {
            console.log(`${key}: ${record[key] === null ? 'NULL' : 'OK'}`);
        });
    } else {
        console.log('No records found in campaigns table.');
    }
}

check();
