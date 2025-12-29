import { supabase } from '../src/utils/supabase';

/**
 * Fix campaigns with missing min_spend
 * Extract from description or calculate from max_discount for percentage campaigns
 */

interface Fix {
    id: number;
    title: string;
    min_spend: number;
    reason: string;
}

async function fixMissingMinSpend(dryRun: boolean = true) {
    console.log('🔍 min_spend eksik kampanyaları düzeltiyorum...\n');

    const fixes: Fix[] = [];

    // Manual fixes based on analysis
    const manualFixes = [
        { id: 14756, min_spend: 300, reason: '%50 indirim, max 150 TL → 300 TL harcama gerekli' },
        { id: 14674, min_spend: 500, reason: 'Açıklamada: "500 TL ve üzeri harcamana"' },
        { id: 14661, min_spend: 3000, reason: 'Açıklamada: "Her 3.000 TL ve üzeri harcamana"' },
        { id: 14883, min_spend: null, reason: 'Başvuru kampanyası, min_spend gereksiz (zaten düzeltildi)' },
        { id: 14851, min_spend: null, reason: 'Dijital portföy açma, min_spend gereksiz' },
        { id: 14788, min_spend: 50, reason: 'Bağış kampanyası, chip-para 5 kat (50 TL → 250 TL)' },
    ];

    for (const fix of manualFixes) {
        if (fix.min_spend !== null) {
            fixes.push({
                id: fix.id,
                title: '', // Will be filled from DB
                min_spend: fix.min_spend,
                reason: fix.reason
            });
        }
    }

    // Fetch campaign titles
    if (fixes.length > 0) {
        const ids = fixes.map(f => f.id);
        const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id, title')
            .in('id', ids);

        if (campaigns) {
            fixes.forEach(fix => {
                const campaign = campaigns.find(c => c.id === fix.id);
                if (campaign) {
                    fix.title = campaign.title;
                }
            });
        }
    }

    if (fixes.length === 0) {
        console.log('✅ Düzeltilecek kampanya yok!\n');
        return;
    }

    console.log(`📊 ${fixes.length} kampanya düzeltilecek\n`);

    // Print preview
    console.log('═'.repeat(60));
    console.log('DÜZELTMELER');
    console.log('═'.repeat(60));

    fixes.forEach((fix, idx) => {
        console.log(`\n${idx + 1}. ID ${fix.id}: ${fix.title.substring(0, 50)}`);
        console.log(`   min_spend: ${fix.min_spend} TL`);
        console.log(`   Sebep: ${fix.reason}`);
    });

    if (dryRun) {
        console.log('\n🔒 DRY RUN MODE - No changes made to database.');
        console.log('   Run with --execute flag to apply fixes.\n');
        return;
    }

    // Execute fixes
    console.log('\n💾 Applying fixes...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const fix of fixes) {
        const { error } = await supabase
            .from('campaigns')
            .update({ min_spend: fix.min_spend })
            .eq('id', fix.id);

        if (error) {
            console.error(`❌ Error fixing ID ${fix.id}:`, error.message);
            errorCount++;
        } else {
            console.log(`✅ Fixed ID ${fix.id}: min_spend = ${fix.min_spend} TL`);
            successCount++;
        }
    }

    console.log(`\n═'.repeat(60)`);
    console.log(`✅ Fix complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('═'.repeat(60));
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (dryRun) {
    console.log('🔍 Running in DRY RUN mode...\n');
} else {
    console.log('⚡ Running in EXECUTE mode...\n');
}

fixMissingMinSpend(dryRun)
    .then(() => {
        console.log('\n✨ Script finished.');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });
