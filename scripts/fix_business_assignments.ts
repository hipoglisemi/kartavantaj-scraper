import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function fixBusiness() {
    const idsToFix = [11549, 11550, 11557, 11563];

    console.log(`Fixing ${idsToFix.length} campaigns to Business...`);

    const { error } = await supabase
        .from('campaigns')
        .update({ card_name: 'Business' })
        .in('id', idsToFix);

    if (error) {
        console.error('Error updating campaigns:', error);
    } else {
        console.log('✅ Campaigns successfully moved to Business card.');
    }
}

fixBusiness();
