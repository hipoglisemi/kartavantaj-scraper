import { supabase } from '../src/utils/supabase';

/**
 * Fix false positive ai_parsing_incomplete flags
 * 
 * Issue: checkMissingFields treats 0 as falsy, so campaigns with min_spend=0
 * are incorrectly flagged as incomplete.
 */

async function fixFalsePositives() {
    console.log('🔧 False Positive AI Incomplete Kampanyaları Düzeltiyoruz...\n');

    // Fetch all AI incomplete Yapı Kredi campaigns
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, card_name, min_spend, max_discount, earning, valid_until, eligible_customers, category, bank')
        .eq('bank', 'Yapı Kredi')
        .eq('ai_parsing_incomplete', true);

    if (error || !campaigns) {
        console.error('❌ Kampanyalar çekilemedi:', error);
        return;
    }

    console.log(`📊 Toplam ${campaigns.length} AI incomplete kampanya bulundu\n`);

    const CRITICAL_FIELDS = ['valid_until', 'eligible_customers', 'min_spend', 'category', 'bank', 'earning'];

    const toFix: number[] = [];
    const stillIncomplete: number[] = [];

    for (const c of campaigns) {
        const missing: string[] = [];

        CRITICAL_FIELDS.forEach(field => {
            const value = c[field];

            // For numeric fields, only null/undefined is missing
            if (field === 'min_spend' || field === 'max_discount') {
                if (value === null || value === undefined) {
                    missing.push(field);
                }
            }
            // For other fields, check for empty/null/undefined
            else if (!value ||
                (Array.isArray(value) && value.length === 0) ||
                value === null ||
                value === undefined ||
                (typeof value === 'string' && value.trim() === '')) {
                missing.push(field);
            }
        });

        if (missing.length === 0) {
            // False positive! All critical fields are actually present
            toFix.push(c.id);
            console.log(`✅ ID ${c.id}: Tüm alanlar mevcut (min_spend: ${c.min_spend})`);
        } else {
            stillIncomplete.push(c.id);
        }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📊 SONUÇLAR');
    console.log('═'.repeat(80));
    console.log(`Toplam AI Incomplete: ${campaigns.length}`);
    console.log(`  ✅ False Positive (düzeltilecek): ${toFix.length}`);
    console.log(`  ❌ Gerçekten Eksik: ${stillIncomplete.length}\n`);

    if (toFix.length === 0) {
        console.log('✨ Düzeltilecek false positive yok!');
        return;
    }

    // Update false positives
    console.log('💾 False positive kampanyaları güncelleniyor...\n');

    const { error: updateError } = await supabase
        .from('campaigns')
        .update({
            ai_parsing_incomplete: false,
            missing_fields: null
        })
        .in('id', toFix);

    if (updateError) {
        console.error('❌ Güncelleme hatası:', updateError);
        return;
    }

    console.log('═'.repeat(80));
    console.log(`✅ ${toFix.length} kampanya başarıyla güncellendi!`);
    console.log('═'.repeat(80));

    if (stillIncomplete.length > 0) {
        console.log(`\n⚠️  ${stillIncomplete.length} kampanya hala gerçekten eksik alanlara sahip.`);
        console.log('   Bu kampanyalar için auto-fixer veya manuel review gerekebilir.');
        console.log(`   IDs: ${stillIncomplete.slice(0, 10).join(', ')}${stillIncomplete.length > 10 ? '...' : ''}`);
    }
}

fixFalsePositives()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
