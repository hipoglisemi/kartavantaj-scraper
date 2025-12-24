import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCampaign() {
    console.log('Fixing campaign 8172...');

    const { error } = await supabase
        .from('campaigns')
        .update({ brand: 'Fenerbahçe' })
        .eq('id', 8172);

    if (error) {
        console.error('Error updating campaign:', error);
    } else {
        console.log('Successfully updated campaign 8172 brand to "Fenerbahçe"');
    }
}

fixCampaign();
