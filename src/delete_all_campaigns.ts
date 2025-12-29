import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function deleteAllCampaigns() {
    console.log('🗑️  Deleting all campaigns...\n');

    const { data: campaigns, error: fetchError } = await supabase
        .from('campaigns')
        .select('id');

    if (fetchError) {
        console.error('❌ Error fetching campaigns:', fetchError.message);
        return;
    }

    console.log(`Found ${campaigns?.length || 0} campaigns to delete\n`);

    const { error: deleteError } = await supabase
        .from('campaigns')
        .delete()
        .neq('id', 0); // Delete all (id != 0 means all)

    if (deleteError) {
        console.error('❌ Error deleting campaigns:', deleteError.message);
        return;
    }

    console.log('✅ All campaigns deleted successfully!\n');

    // Verify
    const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

    console.log(`Remaining campaigns: ${count || 0}`);
}

deleteAllCampaigns();
