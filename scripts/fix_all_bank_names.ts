/**
 * One-time script to normalize all existing bank names in campaigns table
 * Uses the new master_banks system to fix inconsistencies
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { normalizeBankName } from '../src/utils/bankMapper';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function fixAllBankNames() {
    console.log('🔧 Normalizing all bank names in campaigns table...\n');

    // Get all unique bank names
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('bank')
        .not('bank', 'is', null);

    if (!campaigns) {
        console.error('❌ Could not fetch campaigns');
        return;
    }

    const uniqueBanks = [...new Set(campaigns.map(c => c.bank))];
    console.log(`Found ${uniqueBanks.length} unique bank names:\n`);

    const mapping: Record<string, string> = {};

    // Build mapping
    for (const bank of uniqueBanks) {
        const normalized = await normalizeBankName(bank);
        mapping[bank] = normalized;

        const icon = bank === normalized ? '✅' : '🔄';
        console.log(`${icon} "${bank}" → "${normalized}"`);
    }

    console.log('\n📊 Summary:');
    const needsUpdate = Object.entries(mapping).filter(([old, new_]) => old !== new_);
    console.log(`   - ${needsUpdate.length} banks need updating`);
    console.log(`   - ${uniqueBanks.length - needsUpdate.length} banks already correct\n`);

    if (needsUpdate.length === 0) {
        console.log('✅ All bank names are already normalized!');
        return;
    }

    console.log('🔄 Updating campaigns...\n');

    let totalUpdated = 0;

    for (const [oldName, newName] of needsUpdate) {
        const { data, error } = await supabase
            .from('campaigns')
            .update({ bank: newName })
            .eq('bank', oldName)
            .select('id');

        if (error) {
            console.error(`❌ Error updating "${oldName}":`, error.message);
        } else {
            const count = data?.length || 0;
            totalUpdated += count;
            console.log(`✅ Updated ${count} campaigns: "${oldName}" → "${newName}"`);
        }
    }

    console.log(`\n🎉 Done! Updated ${totalUpdated} campaigns total.`);

    // Verify
    console.log('\n🔍 Verification:');
    const { data: afterUpdate } = await supabase
        .from('campaigns')
        .select('bank')
        .not('bank', 'is', null);

    const uniqueAfter = [...new Set(afterUpdate?.map(c => c.bank) || [])];
    console.log(`   - Unique bank names now: ${uniqueAfter.length}`);
    console.table(uniqueAfter.map(b => ({ Bank: b })));
}

fixAllBankNames();
