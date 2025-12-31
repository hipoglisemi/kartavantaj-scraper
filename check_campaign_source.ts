import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkCampaign() {
    const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', 15851)
        .single();

    if (!data) {
        console.log('❌ Kampanya bulunamadı');
        return;
    }

    console.log('\n📋 Kampanya Detayları:\n');
    console.log(`ID: ${data.id}`);
    console.log(`Başlık: ${data.title}`);
    console.log(`Banka: ${data.bank}`);
    console.log(`Kart: ${data.card_name}`);
    console.log(`URL: ${data.reference_url}`);
    console.log(`Görsel: ${data.image}`);
    console.log(`Oluşturulma: ${data.created_at}`);
    console.log(`Güncellenme: ${data.updated_at || 'N/A'}`);
}

checkCampaign();
