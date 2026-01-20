
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkDenizBonus() {
    console.log('🔍 Checking if any Denizbank campaign has card_name="Bonus"...');

    // Fetch Denizbank campaigns where card_name contains "Bonus"
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name')
        .eq('bank', 'Denizbank')
        .ilike('card_name', '%Bonus%');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`Found ${campaigns.length} Denizbank campaigns mentioning Bonus.`);

    // Check for exact "Bonus" or "Bonus" in comma list
    const exactMatches = campaigns.filter(c => {
        const cards = c.card_name.split(',').map(n => n.trim());
        return cards.includes('Bonus');
    });

    console.log(`Found ${exactMatches.length} Denizbank campaigns with EXACT 'Bonus' card name.`);
    if (exactMatches.length > 0) {
        console.log('Sample:', exactMatches[0]);
    }
}

checkDenizBonus();
