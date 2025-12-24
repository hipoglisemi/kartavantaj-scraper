import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkBankSpecifics() {
    console.log('Checking Yapı Kredi and Akbank card names...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, bank, card_name, title, url')
        .or('bank.eq.Akbank,bank.eq."Yapı Kredi"');

    if (error || !data) {
        console.error(error);
        return;
    }

    const issues = data.filter((c: any) => {
        const card = (c.card_name || '').toLowerCase();
        const bank = (c.bank || '').toLowerCase();
        return card === '' || card === bank || card.includes('kartları') || card.includes('müşterileri');
    });

    console.log(`Found ${issues.length} suspicious records for these two banks.\n`);

    issues.forEach((c: any) => {
        console.log(`- [${c.id}] Bank: ${c.bank} | Card: ${c.card_name}`);
        console.log(`  URL: ${c.url}`);
        console.log(`  Title: ${c.title}`);
        console.log('---');
    });
}

checkBankSpecifics();
