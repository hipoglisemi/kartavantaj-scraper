import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// JSON dosyasını okuyamıyoruz çünkü GitHub Actions'ta kaldı. 
// Sadece Supabase verisini analiz edeceğiz.

async function auditQuality() {
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`\n📊 Yüklenen Kampanya: ${campaigns.length}\n`);

    // Analizörleri
    let missingCards = 0;
    let missingMath = 0;
    let weirdDates = 0;
    
    console.log('🔍 Detaylı Analiz:\n');

    campaigns.forEach((c: any, i: number) => {
        let issues = [];

        // 1. Kart Kontrolü
        if (!c.eligible_customers || c.eligible_customers.length === 0) {
            issues.push('❌ Kart bilgisi yok');
            missingCards++;
        } else if (c.eligible_customers.length === 1 && c.eligible_customers[0].includes('Maximum')) {
            // Sadece tek kart var, şüpheli mi?
            // issues.push('⚠️ Tek kart (Maximum)');
        }

        // 2. Matematik Kontrolü
        if (!c.earning && !c.max_discount && !c.min_spend) {
            issues.push('❌ Finansal veri yok');
            missingMath++;
        }

        // 3. Tarih Kontrolü
        const now = new Date();
        const end = new Date(c.valid_until);
        if (end < now) {
            issues.push('⚠️ Süresi geçmiş');
            weirdDates++;
        }

        // Hata varsa yazdır
        if (issues.length > 0) {
            console.log(`${i+1}. [${c.id}] ${c.title.substring(0, 50)}...`);
            issues.forEach(issue => console.log(`   ${issue}`));
            console.log(`   Kartlar: ${c.eligible_customers?.join(', ') || 'YOK'}`);
            console.log(`   Earning: ${c.earning}`);
            console.log(`   Min Spend: ${c.min_spend}\n`);
        }
    });

    console.log('📈 İstatistikler:');
    console.log(`Toplam Sorunlu: ${missingCards + missingMath}`);
    console.log(`Kartı Eksik: ${missingCards}`);
    console.log(`Finansal Veri Eksik: ${missingMath}`);
}

auditQuality();
