import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from './src/services/geminiParser'; // Import the parser directly to use updated logic
import axios from 'axios';

dotenv.config({ path: '.env' });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function fixSpecificCampaign() {
    const id = 17114;
    console.log(`Fixing campaign ${id}...`);

    // 1. Get current data
    const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

    if (!campaign) {
        console.error('Campaign not found');
        return;
    }

    // 2. Fetch fresh HTML (or use local for speed)
    // For this strict fix, let's fetch fresh
    const response = await axios.get(campaign.reference_url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
    });

    // 3. Re-parse
    const newData = await parseWithGemini(response.data, campaign.reference_url, 'Akbank', 'Wings');

    // 4. Update DB
    const { error } = await supabase
        .from('campaigns')
        .update({
            eligible_customers: newData.eligible_customers,
            eligible_cards_detail: newData.eligible_cards_detail,
            ai_enhanced: true
        })
        .eq('id', id);

    if (error) console.error('Error updating:', error.message);
    else {
        console.log('✅ Campaign updated!');
        console.log('New Eligible Customers:', newData.eligible_customers);
    }
}

fixSpecificCampaign();
