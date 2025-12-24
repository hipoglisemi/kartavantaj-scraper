import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkBusiness() {
    const keywords = ['Business', 'Ticari', 'Kobi', 'Esnaf', 'KOBİ', 'Şirket'];

    const { data: allAkbank } = await supabase
        .from('campaigns')
        .select('id, card_name, bank, is_active, title')
        .eq('bank', 'Akbank')
        .eq('is_active', true);

    if (!allAkbank) return;

    const matches = allAkbank.filter(c =>
        keywords.some(kw => c.title.toLowerCase().includes(kw.toLowerCase()))
    );

    console.log(`Found ${matches.length} Akbank campaigns with commercial keywords:`);
    matches.forEach(c => {
        console.log(`- ID: ${c.id}, card_name: "${c.card_name}", Title: "${c.title}"`);
    });
}

checkBusiness();
