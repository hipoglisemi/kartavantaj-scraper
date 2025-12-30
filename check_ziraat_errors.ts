
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function auditZiraat() {
    console.log('🔍 Ziraat Bankkart kampanyaları denetleniyor...\n');

    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'Ziraat')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Hata:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('ℹ️ Ziraat kampanyası bulunamadı.');
        return;
    }

    console.log(`📊 Toplam ${data.length} kampanya bulundu.\n`);

    const errors: any[] = [];

    data.forEach(c => {
        const issues: string[] = [];

        if (!c.brand || c.brand === '' || c.brand === 'Genel') {
            // 'Genel' is sometimes valid, but let's flag if it looks like it should have a brand
            if (c.title.toLowerCase().includes('migros') || c.title.toLowerCase().includes('beymen') || c.title.toLowerCase().includes('n11')) {
                issues.push('Eksik Marka (Title ipucu veriyor)');
            }
        }

        if (c.brand === '' || c.brand === null) {
            issues.push('Brand NULL/Boş');
        }

        if (!c.category || c.category === 'Diğer') {
            issues.push('Eksik/Belirsiz Kategori (Diğer)');
        }

        if (c.min_spend === 0 || c.min_spend === null) {
            // Only flag if earning suggests it should have a min_spend (regex)
            if (c.earning && (c.earning.includes('TL') || c.earning.includes('%'))) {
                issues.push('min_spend 0 veya NULL');
            }
        }

        if (!c.earning || c.earning === '') {
            issues.push('Earning boş');
        }

        if (c.title === 'Başlıksız Kampanya') {
            issues.push('Başlık Hatalı (Başlıksız)');
        }

        // --- DEEP MATH CHECK ---
        const desc = (c.description || '').toLowerCase().replace(/\s+/g, ' ');

        // 1. Tiered Rewards: "1.500 TL ve üzeri her harcamanıza 150 TL, toplam 450 TL"
        const tieredMatch = desc.match(/([\d.]+)\s*tl\s*(ve\s*üzeri\s*)?her\s*(harcamanıza|alışverişinize)\s*([\d.]+)\s*tl.*?toplam\s*([\d.]+)\s*tl/i);
        if (tieredMatch) {
            const perTransaction = parseFloat(tieredMatch[1].replace(/\./g, ''));
            const rewardPerTrans = parseFloat(tieredMatch[4].replace(/\./g, ''));
            const totalReward = parseFloat(tieredMatch[5].replace(/\./g, ''));

            const expectedMinSpend = (totalReward / rewardPerTrans) * perTransaction;
            if (c.min_spend !== expectedMinSpend) {
                issues.push(`Math Hata: Kademeli harcama tutarsızlığı. Beklenen: ${expectedMinSpend}, Bulunan: ${c.min_spend}`);
            }
            if (c.max_discount !== totalReward) {
                issues.push(`Math Hata: Max discount tutarsızlığı. Beklenen: ${totalReward}, Bulunan: ${c.max_discount}`);
            }
        }

        // 2. Percentage Check: "%10 indirim, max 500 TL" -> min_spend = 5000
        const percentMatch = desc.match(/%([\d.]+).*?(indirim|iade|bankkart\s*lira).*?(en\s+fazla|maksimum|toplam|max|varan)\s*([\d.]+)\s*tl/i);
        if (percentMatch) {
            const percentage = parseFloat(percentMatch[1]);
            const maxReward = parseFloat(percentMatch[4].replace(/\./g, ''));
            const expectedMinSpend = Math.round(maxReward / (percentage / 100));

            if (c.min_spend && Math.abs(c.min_spend - expectedMinSpend) > (expectedMinSpend * 0.1)) {
                issues.push(`Math Hata: Yüzde hesaplama tutarsızlığı. Beklenen: ~${expectedMinSpend}, Bulunan: ${c.min_spend}`);
            }
        }

        // 3. Simple threshold: "1.000 TL ve üzeri harcamaya"
        const thresholdMatch = desc.match(/([\d.]+)\s*tl\s*ve\s*üzeri/i);
        if (thresholdMatch && !tieredMatch) {
            const threshold = parseFloat(thresholdMatch[1].replace(/\./g, ''));
            if (c.min_spend < threshold) {
                issues.push(`Math Hata: Eşik değer altında min_spend. Eşik: ${threshold}, Bulunan: ${c.min_spend}`);
            }
        }

        if (issues.length > 0) {
            errors.push({
                id: c.id,
                title: c.title,
                url: c.reference_url,
                issues: issues,
                min_spend: c.min_spend,
                max_discount: c.max_discount,
                earning: c.earning
            });
        }
    });

    if (errors.length > 0) {
        console.log(`❌ Hatalı/Eksik ${errors.length} kampanya tespit edildi:\n`);
        errors.forEach((e, i) => {
            console.log(`${i + 1}. [${e.title}](${e.url})`);
            console.log(`   🚨 Sorunlar: ${e.issues.join(' | ')}`);
            console.log(`      📊 DB Durumu -> Harcama: ${e.min_spend} TL, Kazanç: ${e.max_discount} TL, Earning: "${e.earning}"`);
        });
    } else {
        console.log('✅ Tüm Ziraat kampanyaları temiz görünüyor.');
    }
}

auditZiraat();
