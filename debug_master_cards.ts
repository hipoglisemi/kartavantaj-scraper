
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function inspectCards() {
    console.log('🔍 Inspecting Master Cards...');

    // Fetch all cards and their banks
    const { data: cards, error } = await supabase
        .from('cards')
        .select(`
            id, 
            name, 
            slug, 
            bank_id,
            banks ( name )
        `)
        .ilike('name', '%Bonus%')
        .order('bank_id');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(JSON.stringify(cards, null, 2));
}

inspectCards();
