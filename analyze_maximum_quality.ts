import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function analyzeMaximumCampaigns() {
    console.log('🔍 Maximum Kampanya Analizi\n');

    // Fetch all Maximum campaigns
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error || !campaigns) {
        console.error('❌ Hata:', error);
        return;
    }

    console.log(`📊 Toplam ${campaigns.length} Maximum kampanyası bulundu\n`);

    // Analyze data quality
    const issues = {
        missingImage: 0,
        missingParticipation: 0,
        emptyConditions: 0,
        singleCard: 0,
        noEarning: 0,
        noDiscount: 0,
        longDescription: 0,
        missingBrand: 0
    };

    const samples: any[] = [];

    campaigns.forEach((c: any) => {
        const hasIssue = {
            title: c.title,
            url: c.url,
            issues: [] as string[]
        };

        // Check image
        if (!c.image || c.image.includes('favicon') || c.image.includes('placeholder')) {
            issues.missingImage++;
            hasIssue.issues.push('❌ Görsel yok/hatalı');
        }

        // Check participation_method
        if (!c.participation_method || c.participation_method.length === 0) {
            issues.missingParticipation++;
            hasIssue.issues.push('❌ Katılım şekli yok');
        } else if (c.participation_method[0]?.includes('detayları kontrol')) {
            hasIssue.issues.push('⚠️  Katılım şekli generic');
        }

        // Check conditions
        if (!c.conditions || c.conditions.length === 0) {
            issues.emptyConditions++;
            hasIssue.issues.push('❌ Koşullar boş');
        }

        // Check valid_cards / eligible_customers
        const cards = c.eligible_customers || c.valid_cards || [];
        if (cards.length <= 1) {
            issues.singleCard++;
            hasIssue.issues.push('❌ Tek kart (generic)');
        }

        // Check earning/discount
        if (!c.earning || c.earning === '0' || c.earning === 'Özel Fırsat') {
            issues.noEarning++;
            hasIssue.issues.push('⚠️  Kazanç bilgisi yok');
        }

        if (!c.discount && !c.earning) {
            issues.noDiscount++;
            hasIssue.issues.push('⚠️  İndirim bilgisi yok');
        }

        // Check description length
        if (c.description && c.description.length > 500) {
            issues.longDescription++;
            hasIssue.issues.push('⚠️  Açıklama çok uzun');
        }

        // Check brand
        if (!c.brand || c.brand === 'Genel') {
            issues.missingBrand++;
            hasIssue.issues.push('⚠️  Marka generic');
        }

        if (hasIssue.issues.length > 0) {
            samples.push(hasIssue);
        }
    });

    // Print summary
    console.log('═══════════════════════════════════════');
    console.log('📊 VERİ KALİTESİ RAPORU');
    console.log('═══════════════════════════════════════\n');

    console.log(`❌ Görsel Eksik/Hatalı: ${issues.missingImage}/${campaigns.length} (${Math.round(issues.missingImage / campaigns.length * 100)}%)`);
    console.log(`❌ Katılım Şekli Yok: ${issues.missingParticipation}/${campaigns.length} (${Math.round(issues.missingParticipation / campaigns.length * 100)}%)`);
    console.log(`❌ Koşullar Boş: ${issues.emptyConditions}/${campaigns.length} (${Math.round(issues.emptyConditions / campaigns.length * 100)}%)`);
    console.log(`❌ Tek Kart (Generic): ${issues.singleCard}/${campaigns.length} (${Math.round(issues.singleCard / campaigns.length * 100)}%)`);
    console.log(`⚠️  Kazanç Bilgisi Yok: ${issues.noEarning}/${campaigns.length} (${Math.round(issues.noEarning / campaigns.length * 100)}%)`);
    console.log(`⚠️  İndirim Bilgisi Yok: ${issues.noDiscount}/${campaigns.length} (${Math.round(issues.noDiscount / campaigns.length * 100)}%)`);
    console.log(`⚠️  Açıklama Çok Uzun: ${issues.longDescription}/${campaigns.length} (${Math.round(issues.longDescription / campaigns.length * 100)}%)`);
    console.log(`⚠️  Marka Generic: ${issues.missingBrand}/${campaigns.length} (${Math.round(issues.missingBrand / campaigns.length * 100)}%)`);

    console.log('\n═══════════════════════════════════════');
    console.log('📋 ÖRNEK SORUNLU KAMPANYALAR (İlk 10)');
    console.log('═══════════════════════════════════════\n');

    samples.slice(0, 10).forEach((s, i) => {
        console.log(`${i + 1}. ${s.title}`);
        console.log(`   URL: ${s.url}`);
        s.issues.forEach((issue: string) => console.log(`   ${issue}`));
        console.log('');
    });

    // Save detailed report
    const report = {
        timestamp: new Date().toISOString(),
        totalCampaigns: campaigns.length,
        issues,
        samples: samples.slice(0, 20),
        fullData: campaigns.map((c: any) => ({
            id: c.id,
            title: c.title,
            image: c.image ? '✅' : '❌',
            participation_method: c.participation_method || [],
            conditions: c.conditions?.length || 0,
            eligible_customers: c.eligible_customers || [],
            earning: c.earning,
            discount: c.discount,
            brand: c.brand,
            description_length: c.description?.length || 0
        }))
    };

    fs.writeFileSync('maximum_quality_report.json', JSON.stringify(report, null, 2));
    console.log('✅ Detaylı rapor kaydedildi: maximum_quality_report.json\n');
}

analyzeMaximumCampaigns();
