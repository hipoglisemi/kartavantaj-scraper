import { supabase } from '../src/utils/supabase';

/**
 * Fix percentage-based campaigns to use standardized earning format: "%X (max YTL)"
 * This script identifies campaigns with:
 * 1. earning containing "%" 
 * 2. max_discount > 0
 * 3. earning NOT already in "%X (max YTL)" format
 * 
 * Then updates earning to: "%{percentage} (max {max_discount}TL)"
 */

interface Campaign {
    id: number;
    title: string;
    earning: string | null;
    max_discount: number | null;
    discount_percentage: number | null;
}

async function fixPercentageEarnings(dryRun: boolean = true) {
    console.log('🔍 Fetching percentage-based campaigns...\n');

    // Fetch campaigns with percentage in earning and max_discount set
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, earning, max_discount, discount_percentage')
        .not('earning', 'is', null)
        .like('earning', '%\\%%')
        .gt('max_discount', 0)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching campaigns:', error);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No campaigns found that need fixing.');
        return;
    }

    console.log(`📊 Found ${campaigns.length} percentage campaigns with max_discount.\n`);

    const toUpdate: Array<{ id: number; oldEarning: string; newEarning: string }> = [];

    for (const campaign of campaigns as Campaign[]) {
        const { id, title, earning, max_discount, discount_percentage } = campaign;

        if (!earning || !max_discount) continue;

        // Skip if already in correct format: "%X (max YTL)"
        if (/^%\d+(\.\d+)?\s*\(max\s+\d+TL\)$/i.test(earning.trim())) {
            continue;
        }

        // Extract percentage from earning or use discount_percentage
        let percentage: number | null = null;

        // Try to extract from earning first (e.g., "%10", "%5 İndirim")
        const percentMatch = earning.match(/%(\d+(\.\d+)?)/);
        if (percentMatch) {
            percentage = parseFloat(percentMatch[1]);
        } else if (discount_percentage) {
            percentage = discount_percentage;
        }

        if (!percentage) {
            console.log(`⚠️  Skipping ID ${id}: Could not extract percentage from "${earning}"`);
            continue;
        }

        const newEarning = `%${percentage} (max ${max_discount}TL)`;

        toUpdate.push({
            id,
            oldEarning: earning,
            newEarning
        });

        console.log(`📝 ID ${id}: "${title}"`);
        console.log(`   OLD: "${earning}"`);
        console.log(`   NEW: "${newEarning}"\n`);
    }

    if (toUpdate.length === 0) {
        console.log('✅ All percentage campaigns are already in correct format!');
        return;
    }

    console.log(`\n📊 Summary: ${toUpdate.length} campaigns will be updated.\n`);

    if (dryRun) {
        console.log('🔒 DRY RUN MODE - No changes made to database.');
        console.log('   Run with --execute flag to apply changes.\n');
        return;
    }

    // Execute updates
    console.log('💾 Updating campaigns...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const update of toUpdate) {
        const { error } = await supabase
            .from('campaigns')
            .update({ earning: update.newEarning })
            .eq('id', update.id);

        if (error) {
            console.error(`❌ Error updating ID ${update.id}:`, error.message);
            errorCount++;
        } else {
            successCount++;
        }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (dryRun) {
    console.log('🔍 Running in DRY RUN mode...\n');
} else {
    console.log('⚡ Running in EXECUTE mode...\n');
}

fixPercentageEarnings(dryRun)
    .then(() => {
        console.log('\n✨ Script finished.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });
