import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function fixMissingIDs() {
    console.log('🔧 Fixing missing IDs for campaigns 14333-14341...\n');

    // Get campaigns with missing IDs
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, bank, card_name, brand, sector_slug')
        .gte('id', 14333)
        .lte('id', 14341)
        .is('bank_id', null);

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No campaigns need fixing!');
        return;
    }

    console.log(`Found ${campaigns.length} campaigns to fix:\n`);

    for (const campaign of campaigns) {
        console.log(`📝 Campaign ${campaign.id}: ${campaign.bank} - ${campaign.card_name}`);

        let updates: any = {};

        // 1. Fix bank_id and card_id from bank_configs
        if (campaign.bank) {
            const { data: bankConfig } = await supabase
                .from('bank_configs')
                .select('bank_id, cards')
                .ilike('bank_name', campaign.bank)
                .single();

            if (bankConfig) {
                updates.bank_id = bankConfig.bank_id;
                console.log(`   ✅ bank_id: ${bankConfig.bank_id}`);

                // Find card_id
                if (campaign.card_name && bankConfig.cards) {
                    const card = bankConfig.cards.find((c: any) =>
                        c.name.toLowerCase() === campaign.card_name.toLowerCase()
                    );
                    if (card) {
                        updates.card_id = card.id;
                        console.log(`   ✅ card_id: ${card.id}`);
                    }
                }
            }
        }

        // 2. Fix brand_id from master_brands
        if (campaign.brand) {
            const { data: brandData } = await supabase
                .from('master_brands')
                .select('id')
                .ilike('name', campaign.brand)
                .single();

            if (brandData) {
                updates.brand_id = brandData.id;
                console.log(`   ✅ brand_id: ${brandData.id}`);
            }
        }

        // 3. Fix sector_id from master_sectors
        if (campaign.sector_slug) {
            const { data: sectorData } = await supabase
                .from('master_sectors')
                .select('id')
                .eq('slug', campaign.sector_slug)
                .single();

            if (sectorData) {
                updates.sector_id = sectorData.id;
                console.log(`   ✅ sector_id: ${sectorData.id}`);
            }
        }

        // Update campaign
        if (Object.keys(updates).length > 0) {
            const { error } = await supabase
                .from('campaigns')
                .update(updates)
                .eq('id', campaign.id);

            if (error) {
                console.error(`   ❌ Error updating campaign ${campaign.id}:`, error.message);
            } else {
                console.log(`   ✅ Updated campaign ${campaign.id}\n`);
            }
        } else {
            console.log(`   ⚠️  No IDs found to update\n`);
        }
    }

    console.log('\n✅ Done!');
}

fixMissingIDs();
