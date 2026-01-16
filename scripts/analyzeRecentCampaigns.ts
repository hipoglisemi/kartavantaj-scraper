import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function analyzeRecentCampaigns() {
    console.log('🔍 Son Eklenen Kampanyaları Analiz Ediliyor...\n');

    // Son 50 kampanyayı çek
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, slug, created_at, bank')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('❌ Hata:', error);
        return;
    }

    console.log(`📊 Son 50 Kampanya Analizi:\n`);

    let withSlug = 0;
    let withoutSlug = 0;
    const missingSlugCampaigns: any[] = [];

    campaigns?.forEach(c => {
        if (c.slug && c.slug.trim() !== '') {
            withSlug++;
        } else {
            withoutSlug++;
            missingSlugCampaigns.push(c);
        }
    });

    console.log(`✅ Slug Var: ${withSlug}`);
    console.log(`❌ Slug Yok: ${withoutSlug}\n`);

    if (missingSlugCampaigns.length > 0) {
        console.log('📋 Slug Eksik Kampanyalar:');
        console.log('='.repeat(60));
        missingSlugCampaigns.forEach((c, i) => {
            console.log(`${i + 1}. [ID: ${c.id}] ${c.title.substring(0, 50)}...`);
            console.log(`   Banka: ${c.bank} | Tarih: ${c.created_at}`);
        });
    }

    // Hangi bankalardan geliyor
    console.log('\n\n📊 Slug Eksik Kampanyaların Banka Dağılımı:');
    console.log('='.repeat(60));
    const bankCounts: Record<string, number> = {};
    missingSlugCampaigns.forEach(c => {
        bankCounts[c.bank] = (bankCounts[c.bank] || 0) + 1;
    });

    Object.entries(bankCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([bank, count]) => {
            console.log(`${bank}: ${count} kampanya`);
        });
}

analyzeRecentCampaigns().catch(console.error);
