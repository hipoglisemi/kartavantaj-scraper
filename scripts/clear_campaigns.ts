import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function clearAllCampaigns() {
    console.log('🛑 KAMPANYA SIFIRLAMA İŞLEMİ BAŞLIYOR...');
    console.log('⚠️  DİKKAT: Tüm kampanya verileri kalıcı olarak silinecek.');

    // 1. Get count for confirmation
    const { count, error: countError } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Sayım hatası:', countError);
        return;
    }

    console.log(`📊 Silinecek toplam kampanya sayısı: ${count}`);

    if (count === 0) {
        console.log('✅ Silinecek kampanya bulunamadı.');
        return;
    }

    // 2. Perform deletion
    // Tip: Supabase default olarak tüm tabloyu silmeye izin vermeyebilir (Safe Mode).
    // Bu yüzden id > 0 gibi bir filtre kullanıyoruz.
    const { error: deleteError } = await supabase
        .from('campaigns')
        .delete()
        .gt('id', 0);

    if (deleteError) {
        console.error('❌ Silme işlemi sırasında hata oluştu:', deleteError);
    } else {
        console.log('✨ TÜM KAMPANYALAR BAŞARIYLA TEMİZLENDİ.');
        console.log('🚀 Sistem artık taze veri girişi (Scrape) için hazır.');
    }
}

clearAllCampaigns();
