import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function investigate() {
    const { data } = await supabase
        .from('campaigns')
        .select('id, title, bank, bank_id, card_name, card_id, brand, brand_id, sector_slug, sector_id, created_at, updated_at')
        .in('id', [14330, 14333]);

    fs.writeFileSync('/tmp/campaigns_comparison.json', JSON.stringify(data, null, 2));
    console.log('Written to /tmp/campaigns_comparison.json');
    console.log(JSON.stringify(data, null, 2));
}

investigate();
