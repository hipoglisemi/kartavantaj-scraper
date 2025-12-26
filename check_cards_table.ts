import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('🔍 Tabloları ve ilişkileri kontrol ediyorum...');

    const { data: campaignsCols, error: campaignsError } = await supabase.rpc('get_table_columns', { table_name: 'campaigns' });
    // Note: get_table_columns might not exist, let's try a simple query

    const { data: cardsData, error: cardsError } = await supabase.from('cards').select('*').limit(1);

    if (cardsError) {
        console.log('❌ "cards" tablosuna erişilemedi veya yok:', cardsError.message);
    } else {
        console.log('✅ "cards" tablosu mevcut.');
    }
}

checkTables().catch(console.error);
