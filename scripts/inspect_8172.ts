import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCampaign() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', 8172)
        .single();

    if (error) {
        console.error('Error fetching campaign:', error);
        return;
    }

    console.log('Campaign 8172 Brand:', data.brand);
    console.log('Full Campaign Data:', JSON.stringify(data, null, 2));
}

inspectCampaign();
