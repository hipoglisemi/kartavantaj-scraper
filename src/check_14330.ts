import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function main() {
    const { data } = await supabase
        .from('campaigns')
        .select('id, bank, bank_id, brand, brand_id, sector_slug, sector_id, created_at, updated_at')
        .gte('id', 14330)
        .lte('id', 14335)
        .order('id');

    console.table(data);
}

main().then(() => process.exit(0));
