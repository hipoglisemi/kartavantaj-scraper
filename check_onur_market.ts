import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkCampaign() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .ilike('title', '%Onur Market%')
        .eq('card_name', 'Wings')
        .maybeSingle();

    if (error) {
        console.error('❌ Error:', error.message);
    } else if (data) {
        console.log('✅ Campaign Found:');
        console.log('Title:', data.title);
        console.log('Eligible Customers:', data.eligible_customers);
        console.log('Min Spend:', data.min_spend);
        console.log('Max Discount:', data.max_discount);
        console.log('Earning:', data.earning);
    } else {
        console.log('❓ Campaign not found.');
    }
}

checkCampaign();
