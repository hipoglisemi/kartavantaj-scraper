import { supabase } from '../src/utils/supabase';

async function analyzeWarningsAndInfo() {
    console.log('🔍 Uyarı ve Bilgi Seviyesi Sorunları Detaylı Analiz\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'Yapı Kredi')
        .eq('is_active', true)
        .order('id', { ascending: false });

    if (error || !campaigns) {
        console.error('❌ Kampanyalar çekilemedi:', error);
        return;
    }

    console.log(`📊 Toplam ${campaigns.length} Yapı Kredi kampanyası analiz ediliyor\n`);

    // ISSUE 1: Missing Participation Method (40 campaigns)
    const missingParticipation = campaigns.filter(c =>
        !c.participation_method || c.participation_method.trim() === ''
    );

    // ISSUE 2: Generic Categories (29 campaigns)
    const genericCategories = campaigns.filter(c =>
        c.category === 'Diğer' || c.category === 'Genel'
    );

    // ISSUE 3: Earning Format Issues (9 campaigns)
    const earningFormatIssues = campaigns.filter(c => {
        if (!c.earning) return false;
        const earning = c.earning.toString();
        return !earning.match(/\d/) && !earning.includes('Taksit');
    });

    // ISSUE 4: Earning Quality (5 campaigns)
    const earningQualityIssues = campaigns.filter(c => {
        if (!c.earning) return false;
        const earning = c.earning.toString().toLowerCase();
        return earning.includes('özel fırsat') ||
            earning.includes('kampanya') ||
            earning === 'taksit' ||
            earning === 'indirim';
    });

    console.log('═'.repeat(80));
    console.log('📋 SORUN 1: EKSİK KATILIM YÖNTEMİ (40 kampanya)');
    console.log('═'.repeat(80));
    console.log('\n🔍 İlk 10 Kampanya Detaylı İnceleme:\n');

    for (let i = 0; i < Math.min(10, missingParticipation.length); i++) {
        const c = missingParticipation[i];
        console.log(`📌 ID ${c.id} | ${c.card_name}`);
        console.log(`   Başlık: ${c.title}`);
        console.log(`   URL: ${c.url}`);
        console.log(`   Kategori: ${c.category}`);
        console.log(`   Earning: ${c.earning}`);
        console.log(`   Brand: ${c.brand || 'null'}`);

        // Check if this is a type of campaign that might not need participation
        const titleLower = c.title.toLowerCase();
        const isAutomatic = titleLower.includes('otomatik') ||
            titleLower.includes('doğrudan') ||
            titleLower.includes('tüm') ||
            titleLower.includes('her');
        const isService = titleLower.includes('sigorta') ||
            titleLower.includes('lounge') ||
            titleLower.includes('otopark');

        console.log(`   🤔 Analiz:`);
        if (isAutomatic) {
            console.log(`      - Otomatik kampanya olabilir (katılım gerekmez)`);
        }
        if (isService) {
            console.log(`      - Servis kampanyası (doğrudan geçerli olabilir)`);
        }
        if (!isAutomatic && !isService) {
            console.log(`      - ⚠️  Muhtemelen katılım yöntemi gerekli ama AI bulamadı`);
        }
        console.log('');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📋 SORUN 2: GENEL KATEGORİLER (29 kampanya)');
    console.log('═'.repeat(80));
    console.log('\n🔍 Kategori Dağılımı:\n');

    const categoryBreakdown: Record<string, number> = {};
    for (const c of genericCategories) {
        categoryBreakdown[c.category] = (categoryBreakdown[c.category] || 0) + 1;
    }

    for (const [cat, count] of Object.entries(categoryBreakdown)) {
        console.log(`  ${cat}: ${count} kampanya`);
    }

    console.log('\n🔍 İlk 10 "Diğer" Kategorisindeki Kampanya:\n');

    const digerCampaigns = genericCategories.filter(c => c.category === 'Diğer');
    for (let i = 0; i < Math.min(10, digerCampaigns.length); i++) {
        const c = digerCampaigns[i];
        console.log(`📌 ID ${c.id} | ${c.card_name}`);
        console.log(`   Başlık: ${c.title}`);
        console.log(`   Brand: ${c.brand || 'null'}`);

        // Suggest better category
        const titleLower = c.title.toLowerCase();
        let suggestedCategory = '';

        if (titleLower.includes('otel') || titleLower.includes('konaklama') || titleLower.includes('tatil')) {
            suggestedCategory = 'Turizm & Konaklama';
        } else if (titleLower.includes('uçak') || titleLower.includes('havalimanı') || titleLower.includes('lounge')) {
            suggestedCategory = 'Turizm & Konaklama';
        } else if (titleLower.includes('otopark') || titleLower.includes('transfer') || titleLower.includes('taksi')) {
            suggestedCategory = 'Ulaşım';
        } else if (titleLower.includes('sigorta')) {
            suggestedCategory = 'Sigorta';
        } else if (titleLower.includes('sinema') || titleLower.includes('müze') || titleLower.includes('konser')) {
            suggestedCategory = 'Kültür & Sanat';
        } else if (titleLower.includes('oyun') || titleLower.includes('gaming')) {
            suggestedCategory = 'Dijital Platform';
        }

        if (suggestedCategory) {
            console.log(`   💡 Önerilen Kategori: ${suggestedCategory}`);
        } else {
            console.log(`   ✅ "Diğer" kategorisi uygun görünüyor`);
        }
        console.log('');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📋 SORUN 3: EARNING FORMAT SORUNLARI (9 kampanya)');
    console.log('═'.repeat(80));
    console.log('\n🔍 Detaylı İnceleme:\n');

    for (const c of earningFormatIssues) {
        console.log(`📌 ID ${c.id} | ${c.card_name}`);
        console.log(`   Başlık: ${c.title}`);
        console.log(`   Earning: "${c.earning}"`);
        console.log(`   URL: ${c.url}`);

        // Analyze if this is actually correct
        const titleLower = c.title.toLowerCase();
        const earningLower = c.earning.toString().toLowerCase();

        if (earningLower.includes('uçak') || earningLower.includes('bilet')) {
            console.log(`   ✅ Earning doğru: Uçak bileti kampanyası, sayısal değer beklenmez`);
        } else if (earningLower.includes('sigorta')) {
            console.log(`   ✅ Earning doğru: Sigorta kampanyası, sayısal değer beklenmez`);
        } else if (earningLower.includes('özel') || earningLower.includes('fırsat')) {
            console.log(`   ⚠️  Earning belirsiz: AI daha spesifik bir açıklama yazabilirdi`);
        } else {
            console.log(`   ❌ Earning hatalı: Sayısal değer olmalıydı`);
        }
        console.log('');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📋 SORUN 4: EARNING KALİTE SORUNLARI (5 kampanya)');
    console.log('═'.repeat(80));
    console.log('\n🔍 Detaylı İnceleme:\n');

    for (const c of earningQualityIssues) {
        console.log(`📌 ID ${c.id} | ${c.card_name}`);
        console.log(`   Başlık: ${c.title}`);
        console.log(`   Earning: "${c.earning}"`);
        console.log(`   Min Spend: ${c.min_spend}`);
        console.log(`   Max Discount: ${c.max_discount}`);
        console.log(`   URL: ${c.url}`);
        console.log(`   🤔 Neden "Özel Fırsat"? Kampanya detayına bakmak gerekiyor`);
        console.log('');
    }

    // SUMMARY
    console.log('\n' + '═'.repeat(80));
    console.log('📊 ÖZET ANALİZ');
    console.log('═'.repeat(80));

    console.log('\n1️⃣ EKSİK KATILIM YÖNTEMİ (40 kampanya)');
    const autoOrService = missingParticipation.filter(c => {
        const titleLower = c.title.toLowerCase();
        return titleLower.includes('otomatik') ||
            titleLower.includes('doğrudan') ||
            titleLower.includes('sigorta') ||
            titleLower.includes('lounge') ||
            titleLower.includes('otopark');
    });
    console.log(`   - Otomatik/Servis kampanyaları: ${autoOrService.length} (katılım gerekmeyebilir)`);
    console.log(`   - Gerçekten eksik: ${missingParticipation.length - autoOrService.length}`);
    console.log(`   🎯 Neden: Kaynak HTML'de katılım bilgisi yok veya AI bulamadı`);

    console.log('\n2️⃣ GENEL KATEGORİLER (29 kampanya)');
    const canBeCategorized = digerCampaigns.filter(c => {
        const titleLower = c.title.toLowerCase();
        return titleLower.includes('otel') || titleLower.includes('uçak') ||
            titleLower.includes('otopark') || titleLower.includes('sigorta') ||
            titleLower.includes('sinema') || titleLower.includes('oyun');
    });
    console.log(`   - Daha spesifik kategoriye atanabilir: ${canBeCategorized.length}`);
    console.log(`   - Gerçekten "Diğer": ${digerCampaigns.length - canBeCategorized.length}`);
    console.log(`   🎯 Neden: AI prompt'u bazı kategori eşleşmelerini kaçırıyor`);

    console.log('\n3️⃣ EARNING FORMAT (9 kampanya)');
    const legitimateNonNumeric = earningFormatIssues.filter(c => {
        const earningLower = c.earning.toString().toLowerCase();
        return earningLower.includes('uçak') || earningLower.includes('sigorta');
    });
    console.log(`   - Meşru (uçak bileti, sigorta): ${legitimateNonNumeric.length}`);
    console.log(`   - İyileştirilebilir: ${earningFormatIssues.length - legitimateNonNumeric.length}`);
    console.log(`   🎯 Neden: Bazı kampanyalar gerçekten sayısal kazanç içermiyor`);

    console.log('\n4️⃣ EARNING KALİTE (5 kampanya)');
    console.log(`   - Tümü "Özel Fırsat" gibi genel ifadeler kullanıyor`);
    console.log(`   🎯 Neden: AI kampanya detayından spesifik benefit çıkaramadı`);

    console.log('\n' + '═'.repeat(80));
    console.log('💡 SONUÇ');
    console.log('═'.repeat(80));

    const realIssues = (missingParticipation.length - autoOrService.length) +
        canBeCategorized.length +
        (earningFormatIssues.length - legitimateNonNumeric.length) +
        earningQualityIssues.length;

    const legitimateChoices = autoOrService.length +
        (digerCampaigns.length - canBeCategorized.length) +
        legitimateNonNumeric.length;

    console.log(`\n✅ Meşru AI Kararları: ~${legitimateChoices} kampanya`);
    console.log(`   (Gerçekten katılım yok, gerçekten "Diğer" kategori, vb.)`);

    console.log(`\n⚠️  İyileştirilebilir: ~${realIssues} kampanya`);
    console.log(`   (AI daha iyi yapabilirdi ama kaynak data eksik olabilir)`);

    console.log(`\n🎯 Ana Sorunlar:`);
    console.log(`   1. Kaynak HTML'lerde katılım bilgisi eksik/belirsiz`);
    console.log(`   2. AI prompt bazı kategori eşleşmelerini kaçırıyor`);
    console.log(`   3. Bazı kampanyalar gerçekten sayısal kazanç içermiyor`);
    console.log(`   4. "Özel Fırsat" gibi genel ifadeler için daha iyi fallback gerekli`);

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Analiz tamamlandı!');
    console.log('═'.repeat(80));
}

analyzeWarningsAndInfo()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
