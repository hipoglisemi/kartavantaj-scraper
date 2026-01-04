import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function deleteChippinCampaigns() {
    console.log('🗑️  Deleting all Chippin campaigns...\n');

    const { data, error } = await supabase
        .from('campaigns')
        .delete()
        .eq('bank', 'Chippin');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log('✅ All Chippin campaigns deleted successfully!');
}

deleteChippinCampaigns();
