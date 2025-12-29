import { supabase } from '../src/utils/supabase';

/**
 * Fix brand field issues:
 * 1. Remove card names (Wings, Juzdan, Free, Axess, etc.)
 * 2. Fix long brand names
 */

interface Fix {
    id: number;
    title: string;
    old_brand: string | string[];
    new_brand: string[];
    reason: string;
}

async function fixBrandIssues(dryRun: boolean = true) {
    console.log('🔧 Brand alanı sorunlarını düzeltiyorum...\n');

    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, brand')
        .order('id', { ascending: false });

    if (!campaigns) return;

    const fixes: Fix[] = [];
    const cardNames = ['Axess', 'Wings', 'Bonus', 'Free', 'Juzdan', 'World', 'Play', 'Crystal', 'Yapı', 'Bob'];

    for (const c of campaigns) {
        if (!c.brand) continue;

        const brands = typeof c.brand === 'string'
            ? c.brand.split(',').map((s: string) => s.trim())
            : c.brand;

        let needsFix = false;
        let newBrands: string[] = [];

        // Remove card names
        for (const brand of brands) {
            // Skip if it's a card name
            if (cardNames.some(card => brand.toLowerCase() === card.toLowerCase())) {
                needsFix = true;
                continue;
            }

            // Fix long brand name
            if (brand.length > 50) {
                if (brand.includes('Brisa') || brand.includes('Bridgestone')) {
                    newBrands.push('Bridgestone');
                    needsFix = true;
                } else {
                    newBrands.push(brand); // Keep as is if we don't know how to fix
                }
            } else {
                newBrands.push(brand);
            }
        }

        if (needsFix && newBrands.length > 0) {
            // Remove duplicates
            newBrands = [...new Set(newBrands)];

            fixes.push({
                id: c.id,
                title: c.title,
                old_brand: c.brand,
                new_brand: newBrands,
                reason: 'Kart isimleri ve uzun markalar temizlendi'
            });
        } else if (needsFix && newBrands.length === 0) {
            // All brands were card names, set to empty array
            fixes.push({
                id: c.id,
                title: c.title,
                old_brand: c.brand,
                new_brand: [],
                reason: 'Tüm brand\'ler kart ismi idi, temizlendi'
            });
        }
    }

    console.log(`📊 ${fixes.length} kampanya düzeltilecek\n`);

    // Print preview
    console.log('═'.repeat(60));
    console.log('DÜZELTMELER (ilk 20)');
    console.log('═'.repeat(60));

    fixes.slice(0, 20).forEach((fix, idx) => {
        console.log(`\n${idx + 1}. ID ${fix.id}: ${fix.title.substring(0, 50)}`);
        console.log(`   Eski: ${JSON.stringify(fix.old_brand)}`);
        console.log(`   Yeni: ${JSON.stringify(fix.new_brand)}`);
        console.log(`   Sebep: ${fix.reason}`);
    });

    if (fixes.length > 20) {
        console.log(`\n... ve ${fixes.length - 20} kampanya daha`);
    }

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
            .update({ brand: fix.new_brand })
            .eq('id', fix.id);

        if (error) {
            console.error(`❌ Error fixing ID ${fix.id}:`, error.message);
            errorCount++;
        } else {
            successCount++;
            if (successCount <= 10) {
                console.log(`✅ Fixed ID ${fix.id}`);
            }
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

fixBrandIssues(dryRun)
    .then(() => {
        console.log('\n✨ Script finished.');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });
