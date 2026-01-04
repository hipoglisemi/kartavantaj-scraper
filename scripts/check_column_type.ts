import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkType() {
    const { data, error } = await supabase.from('campaigns').select('conditions').limit(1);
    if (error) {
        console.error(error);
    } else if (data && data.length > 0) {
        const cond = data[0].conditions;
        console.log('Type of conditions:', typeof cond);
        console.log('Is Array?', Array.isArray(cond));
        console.log('Value:', JSON.stringify(cond, null, 2));
    } else {
        console.log('No data found in campaigns table.');
    }
}
checkType();
