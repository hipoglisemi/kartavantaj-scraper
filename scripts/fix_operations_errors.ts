import { supabase } from '../src/utils/supabase';
import { lookupIDs } from '../src/utils/idMapper';

async function fixOperationsErrors() {
    console.log('🚀 Starting Data Quality Repair Script...');

    // 1. Fetch campaigns with missing Brand or Sector IDs
    const { data: faultyCampaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name, brand, sector_slug, category')
        .or('brand_id.is.null,sector_id.is.null');

    if (error) {
        console.error('❌ Error fetching campaigns:', error.message);
        return;
    }

    if (!faultyCampaigns || faultyCampaigns.length === 0) {
        console.log('✅ No faulty campaigns found. Operations Center should be clean!');
        return;
    }

    console.log(`🔍 Found ${faultyCampaigns.length} campaigns to repair.`);

    let repairedCount = 0;

    for (const campaign of faultyCampaigns) {
        try {
            console.log(`   🛠  Repairing: ${campaign.title.substring(0, 40)}...`);

            // Re-run the improved lookup logic
            const newIds = await lookupIDs(
                campaign.bank,
                campaign.card_name,
                campaign.brand,
                campaign.sector_slug,
                campaign.category
            );

            const updates: any = {};
            if (newIds.brand_id) updates.brand_id = newIds.brand_id;
            if (newIds.sector_id) updates.sector_id = newIds.sector_id;

            if (Object.keys(updates).length > 0) {
                const { error: updateErr } = await supabase
                    .from('campaigns')
                    .update(updates)
                    .eq('id', campaign.id);

                if (updateErr) {
                    console.error(`      ❌ Update failed for ID ${campaign.id}:`, updateErr.message);
                } else {
                    repairedCount++;
                    console.log(`      ✅ Repaired [Brand: ${updates.brand_id || 'Keep'}, Sector: ${updates.sector_id || 'Keep'}]`);
                }
            } else {
                console.log(`      ⚠️  No match found even with improved logic.`);
            }
        } catch (e: any) {
            console.error(`      ❌ Unexpected error for ID ${campaign.id}:`, e.message);
        }
    }

    console.log(`\n🏁 Repair finished. Repaired ${repairedCount} out of ${faultyCampaigns.length} campaigns.`);
}

fixOperationsErrors().catch(console.error);
