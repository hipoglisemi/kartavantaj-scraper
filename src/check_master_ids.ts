
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkMasterData() {
    console.log('🔍 Checking master data...');

    const { data: brands } = await supabase.from('master_brands').select('id, name').in('name', ['Vatan Bilgisayar', 'CarrefourSA', 'Patifour', 'Daikin']);
    console.log('Brands:', brands);

    const { data: sectors } = await supabase.from('master_sectors').select('id, name, slug').in('slug', ['elektronik', 'market-gida', 'e-ticaret']);
    console.log('Sectors:', sectors);
}

checkMasterData();
