// Simple script to fix high-confidence Yapı Kredi campaign errors
import { supabase } from '../src/utils/supabase';
import * as dotenv from 'dotenv';

dotenv.config();

// High-confidence errors from validation (ID, suggested min_spend)
const FIXES = [
    { id: 15079, min_spend: 30000 }, // Tiered: Her 7500'e 750, toplam 3000
    { id: 15002, min_spend: 15000 }, // Range: 15000-29999 arası
    { id: 14954, min_spend: 2400 },  // Tiered: Her 800'e 40, toplam 120
    { id: 14749, min_spend: 30000 }, // Tiered
    { id: 14728, min_spend: 10000 }  // Range
];

async function main() {
    console.log('🔧 Yapı Kredi Hata Düzeltme\n');
    console.log(`📋 ${FIXES.length} kampanya düzeltilecek\n`);

    let successCount = 0;
    let failCount = 0;

    for (const fix of FIXES) {
        try {
            // Get current value
            const { data: before, error: fetchError } = await supabase
                .from('campaigns')
                .select('id, title, min_spend')
                .eq('id', fix.id)
                .single();

            if (fetchError) throw fetchError;

            console.log(`\n📝 ID ${fix.id}`);
            console.log(`   Önce: ${before.min_spend}`);
            console.log(`   Sonra: ${fix.min_spend}`);

            // Update
            const { error: updateError } = await supabase
                .from('campaigns')
                .update({ min_spend: fix.min_spend })
                .eq('id', fix.id);

            if (updateError) throw updateError;

            console.log(`   ✅ Güncellendi`);
            successCount++;

        } catch (error: any) {
            console.error(`   ❌ Hata: ${error.message}`);
            failCount++;
        }
    }

    console.log('\n\n📊 ===== SONUÇ =====\n');
    console.log(`✅ Başarılı: ${successCount}`);
    console.log(`❌ Başarısız: ${failCount}`);
    console.log(`📈 Başarı Oranı: ${((successCount / FIXES.length) * 100).toFixed(1)}%\n`);
}

main().catch(console.error);
