import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkCampaign() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, slug, url, bank')
        .eq('id', 22855)
        .single();
    
    if (error) {
        console.error('Hata:', error);
        return;
    }
    
    console.log('📋 Kampanya Detayları:');
    console.log('='.repeat(60));
    console.log(`ID: ${data.id}`);
    console.log(`Başlık: ${data.title}`);
    console.log(`Banka: ${data.bank}`);
    console.log(`Slug: ${data.slug || 'YOK'}`);
    console.log(`URL: ${data.url || 'YOK'}`);
    console.log('='.repeat(60));
    
    // Beklenen URL'ler
    console.log('\n📍 Beklenen URL\'ler:');
    console.log(`ID ile: https://kartavantaj.com/kampanya/${data.id}`);
    if (data.slug) {
        console.log(`Slug ile: https://kartavantaj.com/kampanya/${data.slug}`);
    }
    
    // Paylaş butonu URL'i
    const sharePath = data.slug ? `/kampanya/${data.slug}` : `/kampanya/${data.id}`;
    console.log(`\n🔗 Paylaş Butonu URL'i: https://kartavantaj.com${sharePath}`);
}

checkCampaign().catch(console.error);
