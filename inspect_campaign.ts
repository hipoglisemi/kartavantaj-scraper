import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function inspect(id: number) {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

const targetId = process.argv[2] ? parseInt(process.argv[2]) : 17748;
inspect(targetId);
