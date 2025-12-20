
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkBankData() {
    console.log('🔍 Checking distinct providers and banks...');

    // Get all campaigns to analyze distinct values
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('provider, bank, card_name, id, title')
        .limit(100);

    if (error) {
        console.error('Error fetching campaigns:', error);
        return;
    }

    // Group by provider/bank/card_name
    const groups: Record<string, number> = {};
    const examples: Record<string, any> = {};

    campaigns?.forEach(c => {
        const key = `Provider: '${c.provider}' | Bank: '${c.bank}' | Card: '${c.card_name}'`;
        groups[key] = (groups[key] || 0) + 1;
        if (!examples[key]) examples[key] = c;
    });

    console.log('\n📊 Campaign Groupings:');
    Object.entries(groups).forEach(([key, count]) => {
        console.log(`${key} (Count: ${count})`);
    });

    // Check if there are master tables for banks/cards
    const { data: masterBanks } = await supabase.from('master_banks').select('*');
    const { data: masterCards } = await supabase.from('master_cards').select('*'); // Guessing table name

    console.log('\n🏦 Master Banks:', masterBanks?.map(b => b.name).join(', '));
    console.log('💳 Master Cards (if exists):', masterCards?.length || 'Table not found or empty');

}

checkBankData();
