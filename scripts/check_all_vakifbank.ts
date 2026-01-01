import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkAllVakifbankCampaigns() {
    console.log('\n🔍 Tüm Vakıfbank Kampanyaları Kontrol Ediliyor...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, earning, badge_text, min_spend, max_discount')
        .eq('bank', 'Vakıfbank')
        .order('id', { ascending: false });

    if (error || !campaigns) {
        console.error('❌ Hata:', error?.message);
        return;
    }

    console.log(`📊 Toplam ${campaigns.length} kampanya bulundu\n`);

    let errorCount = 0;
    const errors: any[] = [];

    campaigns.forEach((c, index) => {
        const issues: string[] = [];

        // Check 1: "Puan" in earning but title says "indirim"
        if (c.earning?.includes('Puan') && c.title?.toLowerCase().includes('indirim')) {
            issues.push('Earning "Puan" ama başlıkta "indirim" var');
            errorCount++;
        }

        // Check 2: "İndirim" in earning but badge says "PUAN"
        if (c.earning?.includes('İndirim') && c.badge_text === 'PUAN') {
            issues.push('Earning "İndirim" ama badge "PUAN"');
            errorCount++;
        }

        // Check 3: "Puan" in earning but badge says "İNDİRİM"
        if (c.earning?.includes('Puan') && c.badge_text === 'İNDİRİM') {
            issues.push('Earning "Puan" ama badge "İNDİRİM"');
            errorCount++;
        }

        if (issues.length > 0) {
            errors.push({
                id: c.id,
                title: c.title,
                earning: c.earning,
                badge: c.badge_text,
                issues
            });
        }
    });

    if (errors.length === 0) {
        console.log('✅ Tüm kampanyalar tutarlı!\n');
    } else {
        console.log(`❌ ${errors.length} kampanyada tutarsızlık bulundu:\n`);
        errors.forEach((e, i) => {
            console.log(`${i + 1}. ID ${e.id}: ${e.title.substring(0, 50)}...`);
            console.log(`   Earning: ${e.earning}`);
            console.log(`   Badge: ${e.badge}`);
            e.issues.forEach((issue: string) => console.log(`   ⚠️  ${issue}`));
            console.log('');
        });
    }

    console.log('\n📊 Özet:');
    console.log(`   Toplam: ${campaigns.length}`);
    console.log(`   Hatalı: ${errors.length}`);
    console.log(`   Doğru: ${campaigns.length - errors.length}`);
}

checkAllVakifbankCampaigns();
