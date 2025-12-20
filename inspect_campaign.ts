
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function inspectCampaign() {
    console.log('🔍 Inspecting single campaign...');

    const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('provider', 'World Card (Yapı Kredi)')
        .limit(1)
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Campaign Keys:', Object.keys(campaign));
        console.log('Provider:', campaign.provider);
        console.log('Bank:', campaign.bank);
        console.log('Card Name:', campaign.card_name);

        // Check for potential ID fields
        if ('bank_id' in campaign) console.log('Bank ID:', campaign.bank_id);
        if ('card_id' in campaign) console.log('Card ID:', campaign.card_id);
    }

    console.log('\n🔍 Checking Master Tables...');
    const { data: banks, error: bankError } = await supabase.from('master_banks').select('*');
    if (bankError) console.log('master_banks error:', bankError.message);
    else console.log('master_banks:', banks);

    const { data: cards, error: cardError } = await supabase.from('master_cards').select('*');
    if (cardError) console.log('master_cards error:', cardError.message);
    else console.log('master_cards:', cards);
}

inspectCampaign();
