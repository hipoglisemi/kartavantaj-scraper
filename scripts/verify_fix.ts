import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkCampaign() {
    const { data } = await supabase
        .from('campaigns')
        .select('id, title, ai_enhanced, min_spend, earning')
        .eq('id', 17516)
        .single();

    console.log('Campaign 17516:', data);
}

checkCampaign();
