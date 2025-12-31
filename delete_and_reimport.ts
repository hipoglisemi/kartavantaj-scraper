import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function deleteAndReimport() {
    console.log('\n🗑️  Mevcut Maximum kampanyalarını siliyorum...\n');
    
    const { error, count } = await supabase
        .from('campaigns')
        .delete()
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum');

    if (error) {
        console.error('❌ Silme hatası:', error.message);
        return;
    }

    console.log(`✅ ${count} kampanya silindi\n`);
    console.log('Şimdi import scriptini çalıştırın:\n');
    console.log('npx tsx import_maximum_pc.ts\n');
}

deleteAndReimport();
