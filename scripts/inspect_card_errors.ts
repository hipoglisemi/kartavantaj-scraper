import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function inspect11652() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, bank, card_name, title, url')
        .eq('id', 11652)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    console.log('--- ID 11652 ---');
    console.log(`Bank: ${data.bank}`);
    console.log(`Card: ${data.card_name}`);
    console.log(`URL: ${data.url}`);
    console.log(`Title: ${data.title}`);
    console.log('----------------');

    // Also check for any others exactly like "Yapı Kredi" or "Akbank" in card_name
    const { data: others, error: error2 } = await supabase
        .from('campaigns')
        .select('id, bank, card_name, title, url')
        .or('card_name.eq."Yapı Kredi",card_name.eq.Akbank,card_name.eq.Ziraat,card_name.eq.Halkbank,card_name.eq.Vakıfbank');

    if (error2) {
        console.error(error2);
        return;
    }

    console.log(`\nFound ${others.length} other campaigns with bank name in card_name:`);
    others.forEach(c => {
        console.log(`- [${c.id}] Bank: ${c.bank} | Card: ${c.card_name} | URL: ${c.url}`);
    });
}

inspect11652();
