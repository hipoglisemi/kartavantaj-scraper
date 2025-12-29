import { supabase } from '../src/utils/supabase';

/**
 * Fix two issues:
 * 1. Earning = "Taksit" → Extract number from title and set to "X Taksit"
 * 2. Bad participation_method → Set to standard "Harcamadan önce Juzdan'dan 'Hemen Katıl' butonuna tıklayın."
 */

interface Fix {
    id: number;
    title: string;
    updates: any;
    reason: string;
}

async function fixTaksitAndParticipation(dryRun: boolean = true) {
    console.log('🔍 Sorunları düzeltiyorum...\n');

    const fixes: Fix[] = [];

    // 1. Fix earning = "Taksit"
    const { data: taksitOnly } = await supabase
        .from('campaigns')
        .select('id, title, earning')
        .eq('earning', 'Taksit');

    if (taksitOnly) {
        for (const c of taksitOnly) {
            // Extract number from title
            const match = c.title.match(/(\d+)\s*(?:aya|ay|taksit)/i);
            const newEarning = match ? `${match[1]} Taksit` : 'Taksit İmkanı';

            fixes.push({
                id: c.id,
                title: c.title,
                updates: { earning: newEarning },
                reason: `Earning: "Taksit" → "${newEarning}"`
            });
        }
    }

    // 2. Fix bad participation_method
    const { data: badParticipation } = await supabase
        .from('campaigns')
        .select('id, title, participation_method')
        .or('participation_method.ilike.%indirin%,participation_method.ilike.%yükleyin%');

    if (badParticipation) {
        for (const c of badParticipation) {
            const pm = c.participation_method?.toLowerCase() || '';

            if (pm.includes('indirin') || pm.includes('yükleyin')) {
                // Check if already in fixes
                const existing = fixes.find(f => f.id === c.id);
                if (existing) {
                    existing.updates.participation_method = "Harcamadan önce Juzdan'dan 'Hemen Katıl' butonuna tıklayın.";
                    existing.reason += ` + Katılım metni düzeltildi`;
                } else {
                    fixes.push({
                        id: c.id,
                        title: c.title,
                        updates: { participation_method: "Harcamadan önce Juzdan'dan 'Hemen Katıl' butonuna tıklayın." },
                        reason: 'Katılım metni: "indirin/yükleyin" → Standart format'
                    });
                }
            }
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
        console.log(`   ${fix.reason}`);
        if (fix.updates.earning) {
            console.log(`   → earning: "${fix.updates.earning}"`);
        }
        if (fix.updates.participation_method) {
            console.log(`   → participation_method: "${fix.updates.participation_method.substring(0, 60)}..."`);
        }
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
            .update(fix.updates)
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

fixTaksitAndParticipation(dryRun)
    .then(() => {
        console.log('\n✨ Script finished.');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });
