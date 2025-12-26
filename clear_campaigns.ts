import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function clearCampaigns() {
    console.log('🗑️ Clearing campaigns table...');
    const { error } = await supabase.from('campaigns').delete().neq('id', 0); // Delete all
    if (error) console.error('❌ Error:', error.message);
    else console.log('✅ Campaigns cleared.');
}

clearCampaigns();
