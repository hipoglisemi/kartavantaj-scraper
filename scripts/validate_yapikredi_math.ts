import { supabase } from '../src/utils/supabase';

interface MathIssue {
    id: number;
    title: string;
    card_name: string;
    url: string;
    issue_type: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    details: string;
    current_values: {
        min_spend?: number;
        max_discount?: number;
        earning?: string;
        discount_percentage?: number;
    };
    expected_values?: {
        min_spend?: number;
        max_discount?: number;
        earning?: string;
    };
}

async function validateYapiKrediMath() {
    console.log('🔢 Yapı Kredi Kampanyaları Matematik Doğrulama\n');

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

    const issues: MathIssue[] = [];

    for (const c of campaigns) {
        const titleLower = c.title.toLowerCase();
        const earning = c.earning?.toString() || '';
        const earningLower = earning.toLowerCase();

        // PATTERN 1: Katlanan Kampanyalar (Her X TL'ye Y TL, toplam Z TL)
        // Örnek: "Her 100 TL'ye 20 TL, toplam 100 TL puan"
        const tieredPattern = /her\s+(\d+(?:\.\d+)?)\s*tl/i;
        const tieredMatch = titleLower.match(tieredPattern);

        if (tieredMatch) {
            const perSpend = parseFloat(tieredMatch[1].replace('.', ''));

            // Extract "toplam X TL" from title or earning
            const totalPattern = /toplam(?:da)?\s+(\d+(?:\.\d+)?)\s*tl/i;
            const totalMatchTitle = titleLower.match(totalPattern);
            const totalMatchEarning = earningLower.match(totalPattern);

            let totalReward = 0;
            if (totalMatchTitle) {
                totalReward = parseFloat(totalMatchTitle[1].replace('.', ''));
            } else if (totalMatchEarning) {
                totalReward = parseFloat(totalMatchEarning[1].replace('.', ''));
            }

            if (totalReward > 0) {
                // Extract per-transaction reward
                const perRewardPattern = /(\d+(?:\.\d+)?)\s*tl\s+(?:puan|indirim|iade|chip)/i;
                const perRewardMatch = titleLower.match(perRewardPattern);

                let perReward = 0;
                if (perRewardMatch) {
                    perReward = parseFloat(perRewardMatch[1].replace('.', ''));
                }

                // Calculate expected min_spend
                // Formula: (totalReward / perReward) * perSpend
                if (perReward > 0) {
                    const expectedMinSpend = (totalReward / perReward) * perSpend;

                    if (c.min_spend && Math.abs(c.min_spend - expectedMinSpend) > 50) {
                        issues.push({
                            id: c.id,
                            title: c.title,
                            card_name: c.card_name,
                            url: c.url,
                            issue_type: 'Katlanan Kampanya - min_spend Hatası',
                            severity: 'CRITICAL',
                            details: `Her ${perSpend} TL'ye ${perReward} TL, toplam ${totalReward} TL → min_spend ${expectedMinSpend} olmalı`,
                            current_values: {
                                min_spend: c.min_spend,
                                max_discount: c.max_discount,
                                earning: c.earning
                            },
                            expected_values: {
                                min_spend: expectedMinSpend,
                                max_discount: totalReward
                            }
                        });
                    }

                    // Check max_discount
                    if (c.max_discount && Math.abs(c.max_discount - totalReward) > 10) {
                        issues.push({
                            id: c.id,
                            title: c.title,
                            card_name: c.card_name,
                            url: c.url,
                            issue_type: 'Katlanan Kampanya - max_discount Hatası',
                            severity: 'WARNING',
                            details: `Toplam ${totalReward} TL kazanç → max_discount ${totalReward} olmalı`,
                            current_values: {
                                min_spend: c.min_spend,
                                max_discount: c.max_discount,
                                earning: c.earning
                            },
                            expected_values: {
                                max_discount: totalReward
                            }
                        });
                    }

                    // Check earning format
                    const earningAmount = earning.match(/(\d+(?:\.\d+)?)\s*TL/);
                    if (earningAmount) {
                        const earningValue = parseFloat(earningAmount[1].replace('.', ''));
                        if (Math.abs(earningValue - totalReward) > 10) {
                            issues.push({
                                id: c.id,
                                title: c.title,
                                card_name: c.card_name,
                                url: c.url,
                                issue_type: 'Katlanan Kampanya - earning Hatası',
                                severity: 'WARNING',
                                details: `Earning "${totalReward} TL Puan" olmalı, "${perReward} TL Puan" değil`,
                                current_values: {
                                    earning: c.earning
                                },
                                expected_values: {
                                    earning: `${totalReward} TL Puan`
                                }
                            });
                        }
                    }
                }
            }
        }

        // PATTERN 2: Yüzde + Max Limit Kampanyaları
        // Örnek: "%10 indirim, maksimum 200 TL"
        if (earningLower.includes('%') && c.max_discount) {
            const percentMatch = earning.match(/%(\d+)/);
            if (percentMatch) {
                const percent = parseInt(percentMatch[1]);

                // Check if earning format is correct: "%X (max YTL)"
                const correctFormat = `%${percent} (max ${c.max_discount}TL)`;
                if (!earning.includes('(max') && !earning.includes('maksimum')) {
                    issues.push({
                        id: c.id,
                        title: c.title,
                        card_name: c.card_name,
                        url: c.url,
                        issue_type: 'Yüzde Kampanya - earning Format Hatası',
                        severity: 'INFO',
                        details: `Yüzde + max limit varsa earning formatı "%X (max YTL)" olmalı`,
                        current_values: {
                            earning: c.earning,
                            max_discount: c.max_discount,
                            discount_percentage: c.discount_percentage
                        },
                        expected_values: {
                            earning: correctFormat
                        }
                    });
                }

                // Calculate expected min_spend
                // Formula: max_discount / (percent / 100)
                const expectedMinSpend = Math.round(c.max_discount / (percent / 100));

                if (c.min_spend && Math.abs(c.min_spend - expectedMinSpend) > 100) {
                    issues.push({
                        id: c.id,
                        title: c.title,
                        card_name: c.card_name,
                        url: c.url,
                        issue_type: 'Yüzde Kampanya - min_spend Hatası',
                        severity: 'WARNING',
                        details: `%${percent} indirim, max ${c.max_discount} TL → min_spend ~${expectedMinSpend} olmalı`,
                        current_values: {
                            min_spend: c.min_spend,
                            max_discount: c.max_discount,
                            discount_percentage: c.discount_percentage
                        },
                        expected_values: {
                            min_spend: expectedMinSpend
                        }
                    });
                }

                // Check discount_percentage field
                if (c.discount_percentage && c.discount_percentage !== percent) {
                    issues.push({
                        id: c.id,
                        title: c.title,
                        card_name: c.card_name,
                        url: c.url,
                        issue_type: 'Yüzde Kampanya - discount_percentage Uyumsuz',
                        severity: 'WARNING',
                        details: `Earning "%${percent}" ama discount_percentage: ${c.discount_percentage}`,
                        current_values: {
                            earning: c.earning,
                            discount_percentage: c.discount_percentage
                        },
                        expected_values: {
                            earning: earning
                        }
                    });
                }
            }
        }

        // PATTERN 3: Aralık Kampanyaları (X TL - Y TL arası)
        // Örnek: "1.000 TL - 20.000 TL arası 3 taksit"
        const rangePattern = /(\d+(?:\.\d+)?)\s*tl\s*-\s*(\d+(?:\.\d+)?)\s*tl\s+arası/i;
        const rangeMatch = titleLower.match(rangePattern);

        if (rangeMatch) {
            const minAmount = parseFloat(rangeMatch[1].replace('.', ''));
            const maxAmount = parseFloat(rangeMatch[2].replace('.', ''));

            // min_spend should be the MINIMUM, not maximum
            if (c.min_spend && c.min_spend > minAmount + 100) {
                issues.push({
                    id: c.id,
                    title: c.title,
                    card_name: c.card_name,
                    url: c.url,
                    issue_type: 'Aralık Kampanya - min_spend Hatası',
                    severity: 'CRITICAL',
                    details: `"${minAmount} TL - ${maxAmount} TL arası" → min_spend ${minAmount} olmalı (${maxAmount} değil!)`,
                    current_values: {
                        min_spend: c.min_spend
                    },
                    expected_values: {
                        min_spend: minAmount
                    }
                });
            }
        }

        // PATTERN 4: Earning vs max_discount Tutarsızlığı
        if (c.earning && c.max_discount) {
            const earningMatch = earning.match(/(\d+(?:\.\d+)?)\s*TL/);
            if (earningMatch) {
                const earningAmount = parseFloat(earningMatch[1].replace('.', ''));

                // Allow small differences (rounding)
                if (Math.abs(earningAmount - c.max_discount) > 50) {
                    issues.push({
                        id: c.id,
                        title: c.title,
                        card_name: c.card_name,
                        url: c.url,
                        issue_type: 'Earning vs max_discount Uyumsuzluğu',
                        severity: 'WARNING',
                        details: `Earning "${earningAmount} TL" ama max_discount: ${c.max_discount}`,
                        current_values: {
                            earning: c.earning,
                            max_discount: c.max_discount
                        }
                    });
                }
            }
        }

        // PATTERN 5: Min Spend Mantık Hatası (0 veya çok düşük)
        if (c.earning && c.max_discount && c.max_discount > 100) {
            if (!c.min_spend || c.min_spend === 0) {
                // Check if this is a legitimate 0 min_spend campaign
                const isLegitimateZero = titleLower.includes('hediye') ||
                    titleLower.includes('sigorta') ||
                    titleLower.includes('lounge') ||
                    titleLower.includes('otopark 1 tl') ||
                    earningLower.includes('ücretsiz');

                if (!isLegitimateZero) {
                    issues.push({
                        id: c.id,
                        title: c.title,
                        card_name: c.card_name,
                        url: c.url,
                        issue_type: 'min_spend Mantık Hatası',
                        severity: 'WARNING',
                        details: `max_discount ${c.max_discount} TL ama min_spend: ${c.min_spend || 0}. Muhtemelen hesaplama hatası.`,
                        current_values: {
                            min_spend: c.min_spend || 0,
                            max_discount: c.max_discount,
                            earning: c.earning
                        }
                    });
                }
            }
        }
    }

    // REPORT
    console.log('═'.repeat(80));
    console.log('📊 MATEMATİK DOĞRULAMA SONUÇLARI');
    console.log('═'.repeat(80));
    console.log(`\nToplam Sorun: ${issues.length}\n`);

    // Group by issue type
    const byType: Record<string, MathIssue[]> = {};
    for (const issue of issues) {
        if (!byType[issue.issue_type]) {
            byType[issue.issue_type] = [];
        }
        byType[issue.issue_type].push(issue);
    }

    for (const [type, typeIssues] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length)) {
        const critical = typeIssues.filter(i => i.severity === 'CRITICAL').length;
        const warning = typeIssues.filter(i => i.severity === 'WARNING').length;
        const info = typeIssues.filter(i => i.severity === 'INFO').length;

        console.log('═'.repeat(80));
        console.log(`📋 ${type.toUpperCase()} (${typeIssues.length} sorun)`);
        console.log(`   🔴 Kritik: ${critical} | 🟡 Uyarı: ${warning} | 🔵 Bilgi: ${info}`);
        console.log('═'.repeat(80));

        // Show first 5 of each severity
        const criticalIssues = typeIssues.filter(i => i.severity === 'CRITICAL').slice(0, 5);
        const warningIssues = typeIssues.filter(i => i.severity === 'WARNING').slice(0, 5);

        for (const issue of [...criticalIssues, ...warningIssues]) {
            const icon = issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'WARNING' ? '🟡' : '🔵';
            console.log(`\n${icon} ID ${issue.id} | ${issue.card_name}`);
            console.log(`   Başlık: ${issue.title.substring(0, 70)}${issue.title.length > 70 ? '...' : ''}`);
            console.log(`   Sorun: ${issue.details}`);
            console.log(`   Mevcut: min_spend=${issue.current_values.min_spend}, max_discount=${issue.current_values.max_discount}`);
            console.log(`           earning="${issue.current_values.earning}"`);
            if (issue.expected_values) {
                console.log(`   Beklenen: ${JSON.stringify(issue.expected_values)}`);
            }
            console.log(`   URL: ${issue.url}`);
        }

        if (typeIssues.length > 5) {
            console.log(`\n   ... ve ${typeIssues.length - 5} sorun daha`);
        }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('💡 ÖZET');
    console.log('═'.repeat(80));

    const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
    const warningCount = issues.filter(i => i.severity === 'WARNING').length;
    const infoCount = issues.filter(i => i.severity === 'INFO').length;

    console.log(`\n🔴 Kritik Matematik Hataları: ${criticalCount}`);
    console.log(`🟡 Uyarı Seviyesi: ${warningCount}`);
    console.log(`🔵 Bilgi: ${infoCount}`);

    if (criticalCount > 0) {
        console.log(`\n⚠️  ${criticalCount} kampanyada kritik matematik hatası var!`);
        console.log('   Bu kampanyalar kullanıcıya yanlış bilgi verebilir.');
    }

    if (issues.length === 0) {
        console.log('\n✅ Tüm kampanyalar matematiksel olarak tutarlı!');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Analiz tamamlandı!');
    console.log('═'.repeat(80));
}

validateYapiKrediMath()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
