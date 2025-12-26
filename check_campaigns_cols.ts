import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCampaignsCols() {
    console.log('🔍 campaigns tablosu sütunlarını kontrol ediyorum...');

    const { data, error } = await supabase.from('campaigns').select('*').limit(1);

    if (error) {
        console.error('❌ Hata:', error.message);
    } else if (data && data.length > 0) {
        console.log('Sütunlar:', Object.keys(data[0]));
        console.log('Örnek veri:', data[0]);
    } else {
        console.log('Tablo boş.');
    }
}

checkCampaignsCols().catch(console.error);
