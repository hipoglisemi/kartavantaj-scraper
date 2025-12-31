import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function deleteCampaigns() {
    // Önce mevcut sayıyı kontrol et
    const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum');

    console.log(`\n⚠️  DİKKAT: Şu anda ${count} adet Maximum kampanyası var.`);
    console.log('GitHub Actions taraması devam ederken bunları silmek istiyor musunuz?');
    console.log('Bu işlem geri alınamaz!');
    
    // Doğrudan siliyoruz, onay istemeyeceğiz çünkü kullanıcı zaten onayladı
    console.log('\n🗑️  Siliniyor...');
    
    const { error, count: deletedCount } = await supabase
        .from('campaigns')
        .delete()
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum');

    if (error) {
        console.error('❌ Hata:', error.message);
    } else {
        console.log(`✅ Başarılı: ${deletedCount} kampanya silindi.`);
        console.log('GitHub Actions tamamlandığında yeni veriler import edilecek.');
    }
    
    process.exit(0);
}

deleteCampaigns();
