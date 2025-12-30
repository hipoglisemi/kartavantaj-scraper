import { supabase } from '../src/utils/supabase';

interface AuditIssue {
    id: number;
    title: string;
    card_name: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    category: string;
    issue: string;
    current_value: any;
    expected?: string;
}

async function auditYapiKrediCampaigns() {
    console.log('🔍 Yapı Kredi Kampanyaları Detaylı Denetim Başlıyor...\n');

    // Fetch all Yapı Kredi campaigns
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

    console.log(`📊 Toplam ${campaigns.length} Yapı Kredi kampanyası bulundu\n`);

    const issues: AuditIssue[] = [];
    const stats = {
        total: campaigns.length,
        byCard: {} as Record<string, number>,
        criticalIssues: 0,
        warnings: 0,
        info: 0
    };

    // Critical fields that must be present
    const criticalFields = [
        'title', 'bank', 'card_name', 'valid_until',
        'eligible_customers', 'category', 'earning'
    ];

    // Numeric fields that should be validated
    const numericFields = ['min_spend', 'max_discount', 'discount_percentage'];

    for (const campaign of campaigns) {
        const cardName = campaign.card_name || 'Unknown';
        stats.byCard[cardName] = (stats.byCard[cardName] || 0) + 1;

        // 1. CHECK CRITICAL FIELDS
        for (const field of criticalFields) {
            const value = campaign[field];
            if (!value || value === null || value === undefined ||
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'string' && value.trim() === '')) {
                issues.push({
                    id: campaign.id,
                    title: campaign.title || 'NO TITLE',
                    card_name: cardName,
                    severity: 'CRITICAL',
                    category: 'Missing Critical Field',
                    issue: `${field} alanı boş veya null`,
                    current_value: value
                });
            }
        }

        // 2. CHECK EARNING FIELD QUALITY
        if (campaign.earning) {
            const earning = campaign.earning.toString();

            // Check for generic/placeholder values
            if (earning.toLowerCase().includes('özel fırsat') ||
                earning.toLowerCase().includes('kampanya') ||
                earning.toLowerCase() === 'taksit' ||
                earning.toLowerCase() === 'indirim') {
                issues.push({
                    id: campaign.id,
                    title: campaign.title,
                    card_name: cardName,
                    severity: 'WARNING',
                    category: 'Earning Quality',
                    issue: 'Earning alanı çok genel/belirsiz',
                    current_value: earning,
                    expected: 'Spesifik tutar (örn: "500 TL Puan", "%10 (max 200TL)")'
                });
            }

            // Check for proper formatting
            if (!earning.match(/\d/) && !earning.includes('Taksit')) {
                issues.push({
                    id: campaign.id,
                    title: campaign.title,
                    card_name: cardName,
                    severity: 'WARNING',
                    category: 'Earning Format',
                    issue: 'Earning alanında sayısal değer yok',
                    current_value: earning
                });
            }
        }

        // 3. CHECK NUMERIC FIELDS
        for (const field of numericFields) {
            const value = campaign[field];
            if (value !== null && value !== undefined) {
                if (typeof value !== 'number' || isNaN(value) || value < 0) {
                    issues.push({
                        id: campaign.id,
                        title: campaign.title,
                        card_name: cardName,
                        severity: 'CRITICAL',
                        category: 'Invalid Numeric Value',
                        issue: `${field} geçersiz sayısal değer`,
                        current_value: value,
                        expected: 'Pozitif sayı'
                    });
                }
            }
        }

        // 4. CHECK MATHEMATICAL CONSISTENCY
        if (campaign.min_spend && campaign.max_discount && campaign.earning) {
            const earning = campaign.earning.toString();

            // If earning mentions a specific amount, it should match max_discount
            const earningMatch = earning.match(/(\d+(?:\.\d+)?)\s*TL/);
            if (earningMatch) {
                const earningAmount = parseFloat(earningMatch[1].replace('.', ''));
                if (campaign.max_discount && Math.abs(earningAmount - campaign.max_discount) > 1) {
                    issues.push({
                        id: campaign.id,
                        title: campaign.title,
                        card_name: cardName,
                        severity: 'WARNING',
                        category: 'Math Inconsistency',
                        issue: 'Earning ve max_discount tutarları uyumsuz',
                        current_value: `earning: ${earning}, max_discount: ${campaign.max_discount}`
                    });
                }
            }

            // Check percentage campaigns
            if (earning.includes('%') && campaign.discount_percentage) {
                const percentMatch = earning.match(/%(\d+)/);
                if (percentMatch) {
                    const earningPercent = parseInt(percentMatch[1]);
                    if (earningPercent !== campaign.discount_percentage) {
                        issues.push({
                            id: campaign.id,
                            title: campaign.title,
                            card_name: cardName,
                            severity: 'WARNING',
                            category: 'Percentage Mismatch',
                            issue: 'Earning ve discount_percentage uyumsuz',
                            current_value: `earning: ${earning}, discount_percentage: ${campaign.discount_percentage}`
                        });
                    }
                }
            }
        }

        // 5. CHECK BRAND FIELD
        if (!campaign.brand || campaign.brand === '' || campaign.brand === 'Genel') {
            // Only flag if title suggests a specific brand
            const titleLower = (campaign.title || '').toLowerCase();
            const commonBrands = ['migros', 'carrefour', 'teknosa', 'media markt', 'koçtaş', 'bauhaus'];
            if (commonBrands.some(b => titleLower.includes(b))) {
                issues.push({
                    id: campaign.id,
                    title: campaign.title,
                    card_name: cardName,
                    severity: 'INFO',
                    category: 'Brand Detection',
                    issue: 'Başlıkta marka ismi var ama brand alanı boş/Genel',
                    current_value: campaign.brand || 'null'
                });
            }
        }

        // 6. CHECK CATEGORY
        if (campaign.category === 'Diğer' || campaign.category === 'Genel') {
            issues.push({
                id: campaign.id,
                title: campaign.title,
                card_name: cardName,
                severity: 'INFO',
                category: 'Category Generic',
                issue: 'Kategori çok genel (Diğer/Genel)',
                current_value: campaign.category
            });
        }

        // 7. CHECK PARTICIPATION METHOD
        if (!campaign.participation_method || campaign.participation_method.trim() === '') {
            issues.push({
                id: campaign.id,
                title: campaign.title,
                card_name: cardName,
                severity: 'WARNING',
                category: 'Missing Participation',
                issue: 'Katılım yöntemi belirtilmemiş',
                current_value: campaign.participation_method
            });
        } else {
            const pm = campaign.participation_method.toLowerCase();
            // Check for vague participation methods
            if (pm.includes('uygulamayı indirin') || pm.includes('juzdan\'ı yükleyin')) {
                issues.push({
                    id: campaign.id,
                    title: campaign.title,
                    card_name: cardName,
                    severity: 'INFO',
                    category: 'Participation Quality',
                    issue: 'Katılım yöntemi çok genel',
                    current_value: campaign.participation_method,
                    expected: 'Spesifik adımlar (örn: "Juzdan\'dan Hemen Katıl butonuna tıklayın")'
                });
            }
        }

        // 8. CHECK DATE VALIDITY
        if (campaign.valid_until) {
            const validUntil = new Date(campaign.valid_until);
            const today = new Date();
            if (validUntil < today) {
                issues.push({
                    id: campaign.id,
                    title: campaign.title,
                    card_name: cardName,
                    severity: 'INFO',
                    category: 'Expired Campaign',
                    issue: 'Kampanya süresi dolmuş ama hala aktif',
                    current_value: campaign.valid_until
                });
            }
        }

        // 9. CHECK AI PROCESSING STATUS
        if (campaign.ai_parsing_incomplete === true) {
            issues.push({
                id: campaign.id,
                title: campaign.title,
                card_name: cardName,
                severity: 'CRITICAL',
                category: 'AI Incomplete',
                issue: 'AI parsing tamamlanmamış',
                current_value: 'ai_parsing_incomplete: true'
            });
        }

        // 10. CHECK DISCOUNT FIELD (should only be for installments)
        if (campaign.discount && !campaign.discount.toLowerCase().includes('taksit')) {
            issues.push({
                id: campaign.id,
                title: campaign.title,
                card_name: cardName,
                severity: 'WARNING',
                category: 'Discount Field Misuse',
                issue: 'discount alanı taksit dışı bir şey için kullanılmış',
                current_value: campaign.discount,
                expected: 'Sadece "{N} Taksit" formatı'
            });
        }
    }

    // Calculate statistics
    stats.criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
    stats.warnings = issues.filter(i => i.severity === 'WARNING').length;
    stats.info = issues.filter(i => i.severity === 'INFO').length;

    // PRINT REPORT
    console.log('═'.repeat(80));
    console.log('📊 GENEL İSTATİSTİKLER');
    console.log('═'.repeat(80));
    console.log(`Toplam Kampanya: ${stats.total}`);
    console.log(`\nKart Bazında Dağılım:`);
    for (const [card, count] of Object.entries(stats.byCard)) {
        console.log(`  - ${card}: ${count} kampanya`);
    }
    console.log(`\nToplam Sorun: ${issues.length}`);
    console.log(`  🔴 Kritik: ${stats.criticalIssues}`);
    console.log(`  🟡 Uyarı: ${stats.warnings}`);
    console.log(`  🔵 Bilgi: ${stats.info}\n`);

    // Group issues by category
    const issuesByCategory: Record<string, AuditIssue[]> = {};
    for (const issue of issues) {
        if (!issuesByCategory[issue.category]) {
            issuesByCategory[issue.category] = [];
        }
        issuesByCategory[issue.category].push(issue);
    }

    // Print issues by category
    for (const [category, categoryIssues] of Object.entries(issuesByCategory)) {
        console.log('═'.repeat(80));
        console.log(`📋 ${category.toUpperCase()} (${categoryIssues.length} sorun)`);
        console.log('═'.repeat(80));

        // Group by severity
        const critical = categoryIssues.filter(i => i.severity === 'CRITICAL');
        const warnings = categoryIssues.filter(i => i.severity === 'WARNING');
        const info = categoryIssues.filter(i => i.severity === 'INFO');

        const printIssues = (issueList: AuditIssue[], icon: string) => {
            for (const issue of issueList.slice(0, 10)) { // Show max 10 per severity
                console.log(`\n${icon} ID ${issue.id} | ${issue.card_name}`);
                console.log(`   Başlık: ${issue.title.substring(0, 60)}${issue.title.length > 60 ? '...' : ''}`);
                console.log(`   Sorun: ${issue.issue}`);
                console.log(`   Mevcut: ${JSON.stringify(issue.current_value)}`);
                if (issue.expected) {
                    console.log(`   Beklenen: ${issue.expected}`);
                }
            }
            if (issueList.length > 10) {
                console.log(`\n   ... ve ${issueList.length - 10} sorun daha`);
            }
        };

        if (critical.length > 0) {
            console.log('\n🔴 KRİTİK SORUNLAR:');
            printIssues(critical, '🔴');
        }
        if (warnings.length > 0) {
            console.log('\n🟡 UYARILAR:');
            printIssues(warnings, '🟡');
        }
        if (info.length > 0) {
            console.log('\n🔵 BİLGİLENDİRME:');
            printIssues(info, '🔵');
        }
    }

    // SUMMARY
    console.log('\n' + '═'.repeat(80));
    console.log('📝 ÖZET VE ÖNERİLER');
    console.log('═'.repeat(80));

    if (stats.criticalIssues > 0) {
        console.log('\n🔴 KRİTİK: Öncelikle kritik sorunları düzeltin:');
        console.log('   - Eksik zorunlu alanları doldurun (title, earning, valid_until, vb.)');
        console.log('   - AI parsing incomplete olan kampanyaları yeniden işleyin');
        console.log('   - Geçersiz sayısal değerleri düzeltin');
    }

    if (stats.warnings > 0) {
        console.log('\n🟡 UYARI: Veri kalitesini artırmak için:');
        console.log('   - Earning alanlarını daha spesifik hale getirin');
        console.log('   - Matematiksel tutarsızlıkları gözden geçirin');
        console.log('   - Katılım yöntemlerini netleştirin');
    }

    if (stats.info > 0) {
        console.log('\n🔵 BİLGİ: İyileştirme önerileri:');
        console.log('   - Genel kategorileri (Diğer/Genel) daha spesifik hale getirin');
        console.log('   - Brand detection\'ı geliştirin');
        console.log('   - Süresi dolmuş kampanyaları pasif hale getirin');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Denetim tamamlandı!');
    console.log('═'.repeat(80));
}

auditYapiKrediCampaigns()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
