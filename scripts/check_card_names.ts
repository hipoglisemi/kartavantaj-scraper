import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkCardNames() {
    console.log('Checking for bank/card name overlaps (Broad Scan)...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, bank, card_name, title, url')
        .or('bank.eq.Akbank,bank.eq."Yapı Kredi",bank.eq.Ziraat,bank.eq.Halkbank,bank.eq.Vakıfbank');

    if (error || !data) {
        console.error(error);
        return;
    }

    const suspicious = data.filter((c: any) => {
        const bank = (c.bank || '').toLowerCase().replace(' bankası', '');
        const card = (c.card_name || '').toLowerCase();
        return card === '' || card === bank || card.includes('kartları') || card.includes('tüm');
    });

    console.log(`Found ${suspicious.length} suspicious campaigns:\n`);

    suspicious.forEach((c: any) => {
        console.log(`- [${c.id}] Bank: ${c.bank} | Card: ${c.card_name}`);
        console.log(`  Title: ${c.title}`);
        console.log(`  URL: ${c.url}`);
        console.log('---');
    });
}

checkCardNames();
