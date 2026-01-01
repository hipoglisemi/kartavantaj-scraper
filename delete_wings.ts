import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function deleteWingsCampaigns() {
    console.log('🗑️ Deleting all Wings campaigns...');

    const { count, error } = await supabase
        .from('campaigns')
        .delete({ count: 'exact' })
        .eq('card_name', 'Wings');

    if (error) {
        console.error('❌ Error deleting:', error.message);
    } else {
        console.log(`✅ Successfully deleted ${count} Wings campaigns.`);
    }
}

deleteWingsCampaigns();
