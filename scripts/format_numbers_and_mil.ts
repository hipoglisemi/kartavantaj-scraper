import { supabase } from '../src/utils/supabase';

/**
 * Format big numbers with dots and fix Mil Puan
 * 1. Add dots to numbers >= 1000 (30000 → 30.000)
 * 2. Fix "Mil Puan" campaigns (30000 TL Puan → 30.000 Mil Puan)
 */

interface Campaign {
    id: number;
    title: string;
    earning: string | null;
    description: string | null;
}

interface Fix {
    id: number;
    title: string;
    oldEarning: string;
    newEarning: string;
    reason: string;
}

async function formatNumbersAndFixMil(dryRun: boolean = true) {
    console.log('🔍 Büyük sayıları ve Mil Puan kampanyalarını kontrol ediyorum...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, earning, description')
        .not('earning', 'is', null)
        .order('id', { ascending: false });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    const fixes: Fix[] = [];

    for (const campaign of campaigns as Campaign[]) {
        if (!campaign.earning) continue;

        let newEarning = campaign.earning;
        let reason = '';

        // 1. Check for Mil Puan
        const titleLower = (campaign.title + ' ' + (campaign.description || '')).toLowerCase();
        const hasMil = titleLower.includes('mil') || titleLower.includes('mile');

        if (hasMil && campaign.earning.includes('TL Puan')) {
            newEarning = campaign.earning.replace('TL Puan', 'Mil Puan');
            reason = 'Mil Puan düzeltmesi';
        }

        // 2. Format numbers with dots (1000+)
        const numberMatch = newEarning.match(/(\d+)/g);
        if (numberMatch) {
            let tempEarning = newEarning;
            for (const numStr of numberMatch) {
                const num = parseInt(numStr);
                if (num >= 1000 && !numStr.includes('.')) {
                    const formatted = num.toLocaleString('tr-TR');
                    tempEarning = tempEarning.replace(numStr, formatted);
                    reason = reason ? reason + ' + Nokta formatı' : 'Nokta formatı';
                }
            }
            newEarning = tempEarning;
        }

        // Add to fixes if changed
        if (newEarning !== campaign.earning) {
            fixes.push({
                id: campaign.id,
                title: campaign.title,
                oldEarning: campaign.earning,
                newEarning,
                reason
            });
        }
    }

    if (fixes.length === 0) {
        console.log('✅ Tüm kampanyalar zaten doğru formatta!\n');
        return;
    }

    console.log(`📊 ${fixes.length} kampanya düzeltilecek\n`);

    // Print preview
    console.log('═'.repeat(60));
    console.log('DÜZELTMELER');
    console.log('═'.repeat(60));

    fixes.slice(0, 20).forEach((fix, idx) => {
        console.log(`\n${idx + 1}. ID ${fix.id}: ${fix.title.substring(0, 50)}`);
        console.log(`   Eski: "${fix.oldEarning}"`);
        console.log(`   Yeni: "${fix.newEarning}"`);
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
            .update({ earning: fix.newEarning })
            .eq('id', fix.id);

        if (error) {
            console.error(`❌ Error fixing ID ${fix.id}:`, error.message);
            errorCount++;
        } else {
            successCount++;
            if (successCount <= 10) {
                console.log(`✅ Fixed ID ${fix.id}: ${fix.oldEarning} → ${fix.newEarning}`);
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

formatNumbersAndFixMil(dryRun)
    .then(() => {
        console.log('\n✨ Script finished.');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });
