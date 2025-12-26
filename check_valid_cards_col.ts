
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkValidCards() {
    console.log('🔍 Checking values in valid_cards column...');

    // Select some rows
    const { data, error } = await supabase
        .from('campaigns')
        .select('title, valid_cards')
        .eq('bank', 'Akbank')
        .not('valid_cards', 'is', null)
        .limit(5);

    if (error) {
        console.error('❌ Error checking data:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ No campaigns found with valid_cards populated yet.');
    } else {
        console.log(`✅ Found ${data.length} campaigns with card details:`);
        data.forEach(c => {
            console.log(`   - "${c.title.substring(0, 30)}...": [${c.valid_cards}] (Type: ${typeof c.valid_cards})`);
        });
    }
}

checkValidCards();
