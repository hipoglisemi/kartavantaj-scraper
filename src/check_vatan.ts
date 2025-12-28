
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkVatan() {
    const { data: brands } = await supabase.from('master_brands').select('id, name').ilike('name', '%Vatan%');
    console.log('Vatan Brands:', brands);
}

checkVatan();
