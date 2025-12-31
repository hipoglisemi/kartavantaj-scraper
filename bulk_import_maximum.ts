import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkStatus() {
    const { count: existing } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum');

    console.log('\n📊 Mevcut Durum:\n');
    console.log(`Supabase'de: ${existing} Maximum kampanya`);
    console.log(`JSON'da: Kontrol ediliyor...`);
    console.log('\n⚠️  Seçenekler:');
    console.log('1. Mevcut kampanyaları SİL, hepsini yeniden yükle');
    console.log('2. Sadece YENİ kampanyaları ekle (mevcut olanları atla)');
    console.log('3. Hepsini GÜNCELLE (upsert)');
    console.log('\nHangisini istersiniz?');
}

checkStatus();
