import { supabase } from '../src/utils/supabase';

/**
 * Fix campaigns with empty earning field
 * For installment campaigns: copy discount to earning
 * For others: set to "Özel Fırsat"
 */

async function fixEmptyEarnings(dryRun: boolean = true) {
    console.log('🔍 Boş earning alanlarını düzeltiyorum...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, earning, discount, category')
        .or('earning.is.null,earning.eq.')
        .order('id', { ascending: false });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (campaigns.length === 0) {
        console.log('✅ Tüm kampanyalarda earning alanı dolu!\n');
        return;
    }

    console.log(`📊 ${campaigns.length} kampanya düzeltilecek\n`);

    const fixes: Array<{ id: number, title: string, newEarning: string }> = [];

    for (const c of campaigns) {
        let newEarning = '';

        // If discount has taksit info, use it
        if (c.discount && c.discount.includes('Taksit')) {
            newEarning = c.discount;
        } else {
            // Default fallback
            newEarning = 'Özel Fırsat';
        }

        fixes.push({
            id: c.id,
            title: c.title,
            newEarning
        });
    }

    // Print preview
    console.log('═'.repeat(60));
    console.log('DÜZELTMELER');
    console.log('═'.repeat(60));

    fixes.forEach((fix, idx) => {
        console.log(`\n${idx + 1}. ID ${fix.id}: ${fix.title.substring(0, 50)}`);
        console.log(`   Yeni earning: "${fix.newEarning}"`);
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
            .update({ earning: fix.newEarning })
            .eq('id', fix.id);

        if (error) {
            console.error(`❌ Error fixing ID ${fix.id}:`, error.message);
            errorCount++;
        } else {
            console.log(`✅ Fixed ID ${fix.id}`);
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

fixEmptyEarnings(dryRun)
    .then(() => {
        console.log('\n✨ Script finished.');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });
