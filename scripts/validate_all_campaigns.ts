import { supabase } from '../src/utils/supabase';
import * as fs from 'fs';

/**
 * Comprehensive campaign validation
 * Checks all campaigns for any data quality issues
 */

interface ValidationIssue {
    id: number;
    title: string;
    issue_type: string;
    severity: 'critical' | 'warning' | 'info';
    current_values: any;
    suggested_fix?: any;
    reason: string;
}

async function validateAllCampaigns() {
    console.log('🔍 Tüm kampanyaları doğruluyorum...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('id', { ascending: false });

    if (error || !campaigns) {
        console.error('❌ Error fetching campaigns:', error);
        return;
    }

    console.log(`📊 ${campaigns.length} kampanya kontrol ediliyor...\n`);

    const issues: ValidationIssue[] = [];

    for (const c of campaigns) {
        // 1. Check empty earning
        if (!c.earning || c.earning.trim() === '') {
            issues.push({
                id: c.id,
                title: c.title,
                issue_type: 'EMPTY_EARNING',
                severity: 'critical',
                current_values: { earning: c.earning, discount: c.discount },
                suggested_fix: { earning: c.discount || 'Özel Fırsat' },
                reason: 'Earning alanı boş'
            });
        }

        // 2. Check earning = "Taksit" only
        if (c.earning === 'Taksit') {
            const match = c.title.match(/(\d+)\s*(?:aya|ay|taksit)/i);
            issues.push({
                id: c.id,
                title: c.title,
                issue_type: 'TAKSIT_ONLY',
                severity: 'warning',
                current_values: { earning: c.earning },
                suggested_fix: { earning: match ? `${match[1]} Taksit` : 'Taksit İmkanı' },
                reason: 'Earning sadece "Taksit", sayı eksik'
            });
        }

        // 3. Check number formatting (no dots for 1000+)
        if (c.earning && c.earning.match(/\d{4,}/)) {
            const numbers = c.earning.match(/\d+/g);
            if (numbers) {
                for (const num of numbers) {
                    if (parseInt(num) >= 1000 && !num.includes('.')) {
                        issues.push({
                            id: c.id,
                            title: c.title,
                            issue_type: 'NUMBER_FORMAT',
                            severity: 'info',
                            current_values: { earning: c.earning },
                            reason: `Büyük sayıda nokta yok: ${num}`
                        });
                        break;
                    }
                }
            }
        }

        // 4. Check Mil Puan mismatch
        const titleLower = (c.title + ' ' + (c.description || '')).toLowerCase();
        if ((titleLower.includes('mil') || titleLower.includes('mile')) &&
            c.earning && c.earning.includes('TL Puan')) {
            issues.push({
                id: c.id,
                title: c.title,
                issue_type: 'MIL_PUAN_MISMATCH',
                severity: 'warning',
                current_values: { earning: c.earning },
                suggested_fix: { earning: c.earning.replace('TL Puan', 'Mil Puan') },
                reason: 'Mil kampanyası ama "TL Puan" yazılmış'
            });
        }

        // 5. Check missing min_spend for campaigns with max_discount
        if (c.max_discount && !c.min_spend) {
            // Skip taksit and percentage campaigns
            const earning = c.earning?.toLowerCase() || '';
            if (!earning.includes('taksit') && !earning.includes('%') && earning.match(/\d+/)) {
                issues.push({
                    id: c.id,
                    title: c.title,
                    issue_type: 'MISSING_MIN_SPEND',
                    severity: 'warning',
                    current_values: { earning: c.earning, max_discount: c.max_discount, min_spend: null },
                    reason: 'Kazanç var ama min_spend yok'
                });
            }
        }

        // 6. Check bad participation_method
        const pm = c.participation_method?.toLowerCase() || '';
        if (pm.includes('indirin') || pm.includes('yükleyin')) {
            issues.push({
                id: c.id,
                title: c.title,
                issue_type: 'BAD_PARTICIPATION',
                severity: 'info',
                current_values: { participation_method: c.participation_method },
                suggested_fix: { participation_method: "Harcamadan önce Juzdan'dan 'Hemen Katıl' butonuna tıklayın." },
                reason: 'Genel katılım metni (indirin/yükleyin)'
            });
        }

        // 7. Check PUAN vs İNDİRİM mismatch
        if (c.earning) {
            const hasPuanKeyword = titleLower.match(/puan|chip-para|worldpuan|mil/);
            const hasIndirimKeyword = titleLower.match(/indirim|iade|cashback/);

            if (hasPuanKeyword && c.earning.includes('İndirim')) {
                issues.push({
                    id: c.id,
                    title: c.title,
                    issue_type: 'PUAN_INDIRIM_MISMATCH',
                    severity: 'info',
                    current_values: { earning: c.earning },
                    reason: 'Başlıkta "puan" var ama earning "İndirim"'
                });
            }

            if (hasIndirimKeyword && c.earning.includes('Puan') && !c.earning.includes('Mil')) {
                issues.push({
                    id: c.id,
                    title: c.title,
                    issue_type: 'PUAN_INDIRIM_MISMATCH',
                    severity: 'info',
                    current_values: { earning: c.earning },
                    reason: 'Başlıkta "indirim" var ama earning "Puan"'
                });
            }
        }
    }

    // Group by severity
    const critical = issues.filter(i => i.severity === 'critical');
    const warnings = issues.filter(i => i.severity === 'warning');
    const info = issues.filter(i => i.severity === 'info');

    // Print summary
    console.log('═'.repeat(60));
    console.log('📊 DOĞRULAMA SONUÇLARI');
    console.log('═'.repeat(60));
    console.log(`\n🔴 Critical: ${critical.length}`);
    console.log(`⚠️  Warning: ${warnings.length}`);
    console.log(`ℹ️  Info: ${info.length}`);
    console.log(`\n📋 TOPLAM: ${issues.length} sorun\n`);

    // Print details
    if (critical.length > 0) {
        console.log('\n🔴 CRITICAL ISSUES:');
        critical.forEach((issue, idx) => {
            console.log(`\n${idx + 1}. ID ${issue.id}: ${issue.title.substring(0, 50)}`);
            console.log(`   Type: ${issue.issue_type}`);
            console.log(`   Reason: ${issue.reason}`);
            console.log(`   Current: ${JSON.stringify(issue.current_values)}`);
            if (issue.suggested_fix) {
                console.log(`   Fix: ${JSON.stringify(issue.suggested_fix)}`);
            }
        });
    }

    if (warnings.length > 0) {
        console.log('\n\n⚠️  WARNING ISSUES (first 10):');
        warnings.slice(0, 10).forEach((issue, idx) => {
            console.log(`\n${idx + 1}. ID ${issue.id}: ${issue.title.substring(0, 50)}`);
            console.log(`   Type: ${issue.issue_type}`);
            console.log(`   Reason: ${issue.reason}`);
            if (issue.suggested_fix) {
                console.log(`   Fix: ${JSON.stringify(issue.suggested_fix)}`);
            }
        });
        if (warnings.length > 10) {
            console.log(`\n... ve ${warnings.length - 10} warning daha`);
        }
    }

    // Save to JSON
    const report = {
        timestamp: new Date().toISOString(),
        total_campaigns: campaigns.length,
        total_issues: issues.length,
        by_severity: {
            critical: critical.length,
            warning: warnings.length,
            info: info.length
        },
        by_type: issues.reduce((acc, issue) => {
            acc[issue.issue_type] = (acc[issue.issue_type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        issues: issues
    };

    fs.writeFileSync('output/final_validation_report.json', JSON.stringify(report, null, 2));
    console.log('\n✅ Rapor kaydedildi: output/final_validation_report.json\n');

    return issues;
}

validateAllCampaigns()
    .then(() => {
        console.log('✨ Doğrulama tamamlandı.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
