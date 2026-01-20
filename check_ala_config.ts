import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkAlaCard() {
    console.log('🔍 Checking database for ALA Card configuration...\n');

    // 1. Check cards table
    const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('slug', 'ala-card')
        .maybeSingle();

    if (card) {
        console.log('✅ Found in `cards` table:', card);
    } else {
        console.log('❌ Not found in `cards` table');
        if (cardError) console.error('Error:', cardError);
    }

    // 2. Check bank_configs
    const { data: config, error: configError } = await supabase
        .from('bank_configs')
        .select('*')
        .eq('bank_id', 'turkiye-finans')
        .maybeSingle();

    if (config) {
        console.log('\n✅ Found `bank_configs` entry for Türkiye Finans:');
        console.log('Cards JSON:', JSON.stringify(config.cards, null, 2));
    } else {
        console.log('\n❌ Türkiye Finans not found in `bank_configs`');
    }
}

checkAlaCard();
