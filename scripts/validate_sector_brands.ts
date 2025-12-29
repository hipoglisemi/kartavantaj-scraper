import { supabase } from '../src/utils/supabase';
import * as fs from 'fs';

/**
 * Validate sector and brand mappings
 * Check for inconsistencies and mismatches
 */

interface SectorBrandIssue {
    id: number;
    title: string;
    issue_type: string;
    severity: 'critical' | 'warning' | 'info';
    current_values: {
        category?: string;
        brand?: string[];
        merchant?: string;
    };
    reason: string;
}

async function validateSectorAndBrands() {
    console.log('🔍 Sektör ve marka eşleştirmelerini kontrol ediyorum...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, category, brand, merchant, description')
        .order('id', { ascending: false });

    if (error || !campaigns) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`📊 ${campaigns.length} kampanya kontrol ediliyor...\n`);

    const issues: SectorBrandIssue[] = [];

    // Common brand-sector mappings
    const sectorMappings: Record<string, string[]> = {
        'Market & Gıda': ['CarrefourSA', 'Migros', 'A101', 'BİM', 'ŞOK', 'Carrefour'],
        'Giyim & Aksesuar': ['H&M', 'Zara', 'LC Waikiki', 'Mango', 'Koton', 'Defacto', 'Nike', 'Adidas', 'Puma', 'Reebok', 'Columbia', 'Lumberjack', 'FLO', 'Desa', 'Nine West', 'Polaris'],
        'Elektronik': ['Teknosa', 'MediaMarkt', 'Vatan', 'Apple', 'Samsung', 'Vestel', 'Arçelik', 'Beko', 'Monster', 'Dyson', 'Nespresso', 'Gree'],
        'Seyahat': ['Enuygun', 'Tatilsepeti', 'Pegasus', 'Turkish Airlines', 'THY', 'Pazarama Tatil'],
        'E-Ticaret': ['Trendyol', 'Hepsiburada', 'Amazon', 'N11', 'GittiGidiyor', 'Pazarama'],
        'Mobilya & Dekorasyon': ['IKEA', 'Koçtaş', 'Bauhaus', 'Özdilek', 'İdaş', 'Karaca', 'Korkmaz'],
        'Otomotiv': ['Shell', 'Opet', 'BP', 'Petrol Ofisi', 'Lassa', 'Pirelli', 'Prometeon', 'Bridgestone'],
        'Restoran & Kafe': ['Yemeksepeti', 'Getir', 'Starbucks', 'McDonald\'s', 'Burger King'],
    };

    for (const c of campaigns) {
        // 1. Check empty category
        if (!c.category || c.category.trim() === '') {
            issues.push({
                id: c.id,
                title: c.title,
                issue_type: 'EMPTY_CATEGORY',
                severity: 'critical',
                current_values: { category: c.category },
                reason: 'Kategori boş'
            });
            continue;
        }

        // 2. Check brand-sector mismatch
        if (c.brand && Array.isArray(c.brand) && c.brand.length > 0) {
            for (const brand of c.brand) {
                const expectedSector = Object.entries(sectorMappings).find(([_, brands]) =>
                    brands.some(b => b.toLowerCase() === brand.toLowerCase())
                );

                if (expectedSector && expectedSector[0] !== c.category) {
                    issues.push({
                        id: c.id,
                        title: c.title,
                        issue_type: 'SECTOR_BRAND_MISMATCH',
                        severity: 'warning',
                        current_values: {
                            category: c.category,
                            brand: c.brand,
                            merchant: c.merchant
                        },
                        reason: `Marka "${brand}" genelde "${expectedSector[0]}" sektöründe ama "${c.category}" olarak işaretlenmiş`
                    });
                }
            }
        }

        // 3. Check brand contains card names
        if (c.brand && Array.isArray(c.brand)) {
            const cardNames = ['Axess', 'Wings', 'Bonus', 'Maximum', 'World', 'Bankkart', 'Paraf', 'Free', 'Crystal', 'Play'];
            const invalidBrands = c.brand.filter(b =>
                cardNames.some(card => b.toLowerCase().includes(card.toLowerCase()))
            );

            if (invalidBrands.length > 0) {
                issues.push({
                    id: c.id,
                    title: c.title,
                    issue_type: 'CARD_NAME_IN_BRAND',
                    severity: 'warning',
                    current_values: { brand: c.brand },
                    reason: `Brand alanında kart ismi var: ${invalidBrands.join(', ')}`
                });
            }
        }

        // 4. Check brand contains bank names
        if (c.brand && Array.isArray(c.brand)) {
            const bankNames = ['Akbank', 'Yapı Kredi', 'İş Bankası', 'Garanti', 'Denizbank', 'TEB', 'Halkbank', 'Ziraat'];
            const invalidBrands = c.brand.filter(b =>
                bankNames.some(bank => b.toLowerCase().includes(bank.toLowerCase()))
            );

            if (invalidBrands.length > 0) {
                issues.push({
                    id: c.id,
                    title: c.title,
                    issue_type: 'BANK_NAME_IN_BRAND',
                    severity: 'warning',
                    current_values: { brand: c.brand },
                    reason: `Brand alanında banka ismi var: ${invalidBrands.join(', ')}`
                });
            }
        }

        // 5. Check empty brand for specific categories
        const requiresBrand = ['Market & Gıda', 'Giyim & Aksesuar', 'Elektronik', 'E-Ticaret'];
        if (requiresBrand.includes(c.category) && (!c.brand || c.brand.length === 0)) {
            // Check if merchant has a known brand
            const merchantLower = c.merchant?.toLowerCase() || '';
            const hasKnownBrand = Object.values(sectorMappings).flat().some(b =>
                merchantLower.includes(b.toLowerCase())
            );

            if (hasKnownBrand) {
                issues.push({
                    id: c.id,
                    title: c.title,
                    issue_type: 'MISSING_BRAND',
                    severity: 'info',
                    current_values: { category: c.category, brand: c.brand, merchant: c.merchant },
                    reason: `Merchant'ta marka var ama brand alanı boş`
                });
            }
        }
    }

    // Group by type
    const byType = issues.reduce((acc, issue) => {
        if (!acc[issue.issue_type]) acc[issue.issue_type] = [];
        acc[issue.issue_type].push(issue);
        return acc;
    }, {} as Record<string, SectorBrandIssue[]>);

    // Print summary
    console.log('═'.repeat(60));
    console.log('📊 SEKTÖR & MARKA DOĞRULAMA SONUÇLARI');
    console.log('═'.repeat(60));
    console.log(`\n📋 TOPLAM: ${issues.length} sorun\n`);

    Object.entries(byType).forEach(([type, typeIssues]) => {
        console.log(`\n${type}: ${typeIssues.length} kampanya`);
        typeIssues.slice(0, 5).forEach((issue, idx) => {
            console.log(`  ${idx + 1}. ID ${issue.id}: ${issue.title.substring(0, 50)}`);
            console.log(`     ${issue.reason}`);
            console.log(`     Current: ${JSON.stringify(issue.current_values)}`);
        });
        if (typeIssues.length > 5) {
            console.log(`  ... ve ${typeIssues.length - 5} kampanya daha`);
        }
    });

    // Save report
    const report = {
        timestamp: new Date().toISOString(),
        total_campaigns: campaigns.length,
        total_issues: issues.length,
        by_type: Object.entries(byType).reduce((acc, [type, items]) => {
            acc[type] = items.length;
            return acc;
        }, {} as Record<string, number>),
        issues: issues
    };

    fs.writeFileSync('output/sector_brand_validation.json', JSON.stringify(report, null, 2));
    console.log('\n✅ Rapor kaydedildi: output/sector_brand_validation.json\n');
}

validateSectorAndBrands()
    .then(() => {
        console.log('✨ Doğrulama tamamlandı.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
