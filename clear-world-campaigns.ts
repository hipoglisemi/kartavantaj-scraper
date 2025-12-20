
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function clearWorldCampaigns() {
    console.log('🗑️  Clearing all "World Card (Yapı Kredi)" campaigns...');

    // First count them
    const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('provider', 'World Card (Yapı Kredi)');

    console.log(`📊 Found ${count} campaigns to delete.`);

    // Delete
    const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('provider', 'World Card (Yapı Kredi)');

    if (error) {
        console.error('❌ Error deleting campaigns:', error.message);
    } else {
        console.log('✅ Successfully deleted all World Card campaigns!');
        console.log('🚀 Now you can run the GitHub Action to re-populate them.');
    }
}

clearWorldCampaigns();
