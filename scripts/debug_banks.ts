import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkBanks() {
    console.log('🔍 Checking distinct banks...');

    // Hack to get distinct banks (Supabase doesn't have .distinct() easily in js client without rpc generally, but let's try reading all bank columns)
    // Or just fetch latest 100 and print unique banks.
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('bank')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error(error);
        return;
    }

    const banks = [...new Set(campaigns.map(c => c.bank))];
    console.log('Banks found:', banks);
}

checkBanks();
