import { supabase } from '../src/utils/supabase';

async function investigateAIFailures() {
    console.log('🔬 AI Parsing Hatalarını Derinlemesine İnceliyoruz...\n');

    // Fetch AI incomplete campaigns with all details
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'Yapı Kredi')
        .eq('ai_parsing_incomplete', true)
        .order('id', { ascending: false });

    if (error || !campaigns) {
        console.error('❌ Kampanyalar çekilemedi:', error);
        return;
    }

    console.log(`📊 Toplam ${campaigns.length} AI incomplete kampanya bulundu\n`);

    // Critical fields as defined in geminiParser.ts
    const CRITICAL_FIELDS = ['valid_until', 'eligible_customers', 'min_spend', 'category', 'bank', 'earning'];

    // Analysis structures
    const missingFieldStats: Record<string, number> = {};
    const cardStats: Record<string, number> = {};
    const categoryStats: Record<string, number> = {};
    const patterns: {
        hasMinSpend: number;
        hasMaxDiscount: number;
        hasEarning: number;
        hasValidUntil: number;
        hasEligibleCustomers: number;
        hasCategory: number;
        hasParticipation: number;
        hasBrand: number;
    } = {
        hasMinSpend: 0,
        hasMaxDiscount: 0,
        hasEarning: 0,
        hasValidUntil: 0,
        hasEligibleCustomers: 0,
        hasCategory: 0,
        hasParticipation: 0,
        hasBrand: 0
    };

    console.log('═'.repeat(80));
    console.log('📋 DETAYLI KAMPANYA ANALİZİ (İlk 20 Kampanya)');
    console.log('═'.repeat(80));

    for (let i = 0; i < Math.min(20, campaigns.length); i++) {
        const c = campaigns[i];

        console.log(`\n🔍 ID ${c.id} | ${c.card_name}`);
        console.log(`   Başlık: ${c.title}`);
        console.log(`   URL: ${c.url || 'N/A'}`);

        // Check which critical fields are missing
        const missing: string[] = [];
        CRITICAL_FIELDS.forEach(field => {
            const value = c[field];
            if (!value || value === null || value === undefined ||
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'string' && value.trim() === '')) {
                missing.push(field);
                missingFieldStats[field] = (missingFieldStats[field] || 0) + 1;
            }
        });

        console.log(`   ❌ Eksik Kritik Alanlar: ${missing.length > 0 ? missing.join(', ') : 'YOK (??)'}`);

        // Check what we DO have
        const present: string[] = [];
        if (c.min_spend !== null && c.min_spend !== undefined) {
            present.push(`min_spend: ${c.min_spend}`);
            patterns.hasMinSpend++;
        }
        if (c.max_discount !== null && c.max_discount !== undefined) {
            present.push(`max_discount: ${c.max_discount}`);
            patterns.hasMaxDiscount++;
        }
        if (c.earning) {
            present.push(`earning: "${c.earning}"`);
            patterns.hasEarning++;
        }
        if (c.valid_until) {
            present.push(`valid_until: ${c.valid_until}`);
            patterns.hasValidUntil++;
        }
        if (c.eligible_customers && c.eligible_customers.length > 0) {
            present.push(`eligible_customers: [${c.eligible_customers.join(', ')}]`);
            patterns.hasEligibleCustomers++;
        }
        if (c.category) {
            present.push(`category: ${c.category}`);
            patterns.hasCategory++;
        }
        if (c.participation_method) {
            present.push(`participation: "${c.participation_method.substring(0, 50)}..."`);
            patterns.hasParticipation++;
        }
        if (c.brand && c.brand !== 'Genel') {
            present.push(`brand: ${c.brand}`);
            patterns.hasBrand++;
        }

        console.log(`   ✅ Mevcut Alanlar: ${present.join(' | ')}`);

        // Check if missing_fields column exists and what it says
        if (c.missing_fields) {
            console.log(`   📝 missing_fields kolonu: ${JSON.stringify(c.missing_fields)}`);
        }

        // Track by card
        cardStats[c.card_name] = (cardStats[c.card_name] || 0) + 1;

        // Track by category
        if (c.category) {
            categoryStats[c.category] = (categoryStats[c.category] || 0) + 1;
        }
    }

    // Count all campaigns for patterns
    for (const c of campaigns) {
        if (c.min_spend !== null && c.min_spend !== undefined) patterns.hasMinSpend++;
        if (c.max_discount !== null && c.max_discount !== undefined) patterns.hasMaxDiscount++;
        if (c.earning) patterns.hasEarning++;
        if (c.valid_until) patterns.hasValidUntil++;
        if (c.eligible_customers && c.eligible_customers.length > 0) patterns.hasEligibleCustomers++;
        if (c.category) patterns.hasCategory++;
        if (c.participation_method) patterns.hasParticipation++;
        if (c.brand && c.brand !== 'Genel') patterns.hasBrand++;

        // Track all missing fields
        CRITICAL_FIELDS.forEach(field => {
            const value = c[field];
            if (!value || value === null || value === undefined ||
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'string' && value.trim() === '')) {
                missingFieldStats[field] = (missingFieldStats[field] || 0) + 1;
            }
        });

        cardStats[c.card_name] = (cardStats[c.card_name] || 0) + 1;
        if (c.category) {
            categoryStats[c.category] = (categoryStats[c.category] || 0) + 1;
        }
    }

    // STATISTICS
    console.log('\n' + '═'.repeat(80));
    console.log('📊 EKSİK ALAN İSTATİSTİKLERİ (72 kampanya içinde)');
    console.log('═'.repeat(80));

    const sortedMissing = Object.entries(missingFieldStats).sort((a, b) => b[1] - a[1]);
    for (const [field, count] of sortedMissing) {
        const percentage = ((count / campaigns.length) * 100).toFixed(1);
        console.log(`  ${field.padEnd(25)} : ${count.toString().padStart(2)} kampanya (%${percentage})`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📊 MEVCUT ALAN İSTATİSTİKLERİ (72 kampanya içinde)');
    console.log('═'.repeat(80));
    console.log(`  min_spend              : ${patterns.hasMinSpend}/${campaigns.length} (%${((patterns.hasMinSpend / campaigns.length) * 100).toFixed(1)})`);
    console.log(`  max_discount           : ${patterns.hasMaxDiscount}/${campaigns.length} (%${((patterns.hasMaxDiscount / campaigns.length) * 100).toFixed(1)})`);
    console.log(`  earning                : ${patterns.hasEarning}/${campaigns.length} (%${((patterns.hasEarning / campaigns.length) * 100).toFixed(1)})`);
    console.log(`  valid_until            : ${patterns.hasValidUntil}/${campaigns.length} (%${((patterns.hasValidUntil / campaigns.length) * 100).toFixed(1)})`);
    console.log(`  eligible_customers     : ${patterns.hasEligibleCustomers}/${campaigns.length} (%${((patterns.hasEligibleCustomers / campaigns.length) * 100).toFixed(1)})`);
    console.log(`  category               : ${patterns.hasCategory}/${campaigns.length} (%${((patterns.hasCategory / campaigns.length) * 100).toFixed(1)})`);
    console.log(`  participation_method   : ${patterns.hasParticipation}/${campaigns.length} (%${((patterns.hasParticipation / campaigns.length) * 100).toFixed(1)})`);
    console.log(`  brand                  : ${patterns.hasBrand}/${campaigns.length} (%${((patterns.hasBrand / campaigns.length) * 100).toFixed(1)})`);

    console.log('\n' + '═'.repeat(80));
    console.log('📊 KART BAZINDA DAĞILIM');
    console.log('═'.repeat(80));
    for (const [card, count] of Object.entries(cardStats).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${card.padEnd(20)} : ${count} kampanya`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📊 KATEGORİ BAZINDA DAĞILIM');
    console.log('═'.repeat(80));
    for (const [cat, count] of Object.entries(categoryStats).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${cat.padEnd(25)} : ${count} kampanya`);
    }

    // DEEP DIVE: Check specific problematic campaigns
    console.log('\n' + '═'.repeat(80));
    console.log('🔬 DERİN ANALİZ: Spesifik Sorunlu Kampanyalar');
    console.log('═'.repeat(80));

    // Find campaigns with NO critical fields missing but still marked incomplete
    const falsePositives = campaigns.filter(c => {
        const missing = CRITICAL_FIELDS.filter(field => {
            const value = c[field];
            return !value || value === null || value === undefined ||
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'string' && value.trim() === '');
        });
        return missing.length === 0;
    });

    if (falsePositives.length > 0) {
        console.log(`\n⚠️  FALSE POSITIVE: ${falsePositives.length} kampanya tüm kritik alanlara sahip ama yine de incomplete işaretli!`);
        console.log('   Bu kampanyalar muhtemelen yanlışlıkla incomplete olarak işaretlenmiş.\n');

        for (const c of falsePositives.slice(0, 5)) {
            console.log(`   ID ${c.id}: ${c.title.substring(0, 60)}`);
        }
    } else {
        console.log('\n✅ FALSE POSITIVE YOK: Tüm incomplete kampanyalar gerçekten eksik alanlara sahip.');
    }

    // Find campaigns missing ONLY one critical field
    const singleFieldMissing = campaigns.filter(c => {
        const missing = CRITICAL_FIELDS.filter(field => {
            const value = c[field];
            return !value || value === null || value === undefined ||
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'string' && value.trim() === '');
        });
        return missing.length === 1;
    });

    if (singleFieldMissing.length > 0) {
        console.log(`\n🎯 TEK ALAN EKSİK: ${singleFieldMissing.length} kampanya sadece 1 kritik alan eksik`);
        const fieldCounts: Record<string, number> = {};
        for (const c of singleFieldMissing) {
            const missing = CRITICAL_FIELDS.find(field => {
                const value = c[field];
                return !value || value === null || value === undefined ||
                    (Array.isArray(value) && value.length === 0) ||
                    (typeof value === 'string' && value.trim() === '');
            });
            if (missing) {
                fieldCounts[missing] = (fieldCounts[missing] || 0) + 1;
            }
        }
        console.log('   Eksik alanların dağılımı:');
        for (const [field, count] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) {
            console.log(`     - ${field}: ${count} kampanya`);
        }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('💡 SONUÇ VE HİPOTEZLER');
    console.log('═'.repeat(80));

    console.log('\n1️⃣ En Çok Eksik Olan Alanlar:');
    for (const [field, count] of sortedMissing.slice(0, 3)) {
        const percentage = ((count / campaigns.length) * 100).toFixed(1);
        console.log(`   - ${field}: %${percentage} eksik`);
    }

    console.log('\n2️⃣ Olası Nedenler:');
    console.log('   a) Gemini API bazı kampanya türlerinde belirli alanları çıkaramıyor');
    console.log('   b) Kaynak HTML/metin bu bilgileri içermiyor olabilir');
    console.log('   c) AI prompt belirli kampanya formatlarını kapsayamıyor');
    console.log('   d) Stage 2 surgical parsing bu eksik alanları dolduramıyor');

    console.log('\n3️⃣ Öneriler:');
    if (falsePositives.length > 0) {
        console.log('   - False positive kampanyaları temizle (ai_parsing_incomplete = false)');
    }
    if (singleFieldMissing.length > 0) {
        console.log('   - Tek alan eksik kampanyalar için targeted surgical fix çalıştır');
    }
    console.log('   - En çok eksik olan alanlar için prompt iyileştirmesi yap');
    console.log('   - Kaynak HTML/metinleri manuel kontrol et (özellikle Crystal kampanyaları)');

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Analiz tamamlandı!');
    console.log('═'.repeat(80));
}

investigateAIFailures()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
