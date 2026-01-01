import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function check() {
    const ids = [16273, 16286];
    const { data } = await supabase
        .from('campaigns')
        .select('id, title, brand, sector_slug, category, participation_method, eligible_customers, min_spend, max_discount, earning, discount, valid_until, image')
        .in('id', ids);

    console.log(JSON.stringify(data, null, 2));
}

check();
