
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function fixCardNames() {
    console.log('🔧 Fixing card names to "World"...');

    // 1. Update lowercase 'world'
    const { data: dataWorld, error: errorWorld } = await supabase
        .from('campaigns')
        .update({ card_name: 'World' })
        .eq('provider', 'World Card (Yapı Kredi)')
        .eq('card_name', 'world')
        .select();

    if (errorWorld) console.error('Error fixing "world":', errorWorld.message);
    else console.log(`✅ Updated "world" -> "World": ${dataWorld?.length || 0} rows`);

    // 2. Update 'Worldcard'
    const { data: dataWorldcard, error: errorWorldcard } = await supabase
        .from('campaigns')
        .update({ card_name: 'World' })
        .eq('provider', 'World Card (Yapı Kredi)')
        .eq('card_name', 'Worldcard')
        .select();

    if (errorWorldcard) console.error('Error fixing "Worldcard":', errorWorldcard.message);
    else console.log(`✅ Updated "Worldcard" -> "World": ${dataWorldcard?.length || 0} rows`);
}

fixCardNames();
