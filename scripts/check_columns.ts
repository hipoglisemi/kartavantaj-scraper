import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkColumns() {
    const { data } = await supabase.from('campaigns').select('*').limit(1);
    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        console.log('Current row data:', JSON.stringify(data[0], null, 2));
    }
}
checkColumns();
