import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

function extractAmount(text: string): number | null {
    if (!text) return null;
    const clean = text.replace(/\./g, '').replace(',', '.').replace(/ TL.*/i, '');
    const match = clean.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
}

async function checkMath() {
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum')
        .order('created_at', { ascending: false });

    console.log(`\n🔍 ${campaigns?.length} Kampanya için Matematik Kontrolü:\n`);

    let issues = 0;

    campaigns?.forEach((c: any) => {
        const titleAmount = extractAmount(c.title);
        const earningAmount = extractAmount(c.earning);
        const minSpendAmount = c.min_spend;

        // Kural 1: Başlıkta para var ama earning/min_spend yok
        if (titleAmount && titleAmount > 100 && !earningAmount && !minSpendAmount) {
            console.log(`❌ [${c.id}] EKSİK VERİ:`);
            console.log(`   Başlık: ${c.title} (Bulunan: ${titleAmount})`);
            console.log(`   Earning: ${c.earning}`);
            console.log(`   Min Spend: ${c.min_spend}`);
            console.log(`   Sebep: Başlıkta para var ama finansal alanlar boş!\n`);
            issues++;
        }

        // Kural 2: Başlık > Earning (Varan kampanyalar)
        else if (titleAmount && earningAmount && titleAmount > earningAmount && c.title.toLowerCase().includes('varan')) {
            console.log(`⚠️  [${c.id}] TUTAR UYUŞMAZLIĞI (VARAN):`);
            console.log(`   Başlık: ${c.title} (Beklenen: ${titleAmount})`);
            console.log(`   Earning: ${c.earning} (Bulunan: ${earningAmount})`);
            console.log(`   Fark: ${titleAmount - earningAmount} TL eksik`);
            console.log(`   Metin Uzunluğu: ${c.description?.length} karakter (Eksik çekilmiş olabilir)\n`);
            issues++;
        }
    });

    if (issues === 0) console.log('✅ Hiçbir bariz tutarsızlık bulunamadı.');
    else console.log(`🛑 Toplam ${issues} şüpheli kampanya bulundu.`);
}

checkMath();
