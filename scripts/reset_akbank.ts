
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the scraper's .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAkbank() {
    console.log('🗑️ Deleting all Akbank campaigns to force re-scrape...');

    // Check count before
    const { count: beforeCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('bank', 'Akbank');

    console.log(`📊 Found ${beforeCount} campaigns before deletion.`);

    const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('bank', 'Akbank');

    if (error) {
        console.error('❌ Error deleting campaigns:', error);
        return;
    }

    console.log('✅ Successfully deleted Akbank campaigns.');
}

resetAkbank();
