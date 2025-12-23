import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function verify() {
    console.log('--- checking last 10 campaigns ---');
    const { data, error } = await supabase
        .from('campaigns')
        .select('title, image, card_name, bank, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    data.forEach(c => {
        console.log(`[${c.bank}] [${c.card_name}] ${c.title}`);
        console.log(`   Image: ${c.image || 'MISSING'}`);
    });

    console.log('\n--- unique card names in db ---');
    const { data: cards } = await supabase.from('campaigns').select('card_name');
    if (cards) {
        const unique = [...new Set(cards.map(c => c.card_name).filter(Boolean))].sort();
        console.log(unique.join(', '));
    }
}

verify();
