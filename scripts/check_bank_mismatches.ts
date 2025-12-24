import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkBankCardMismatches() {
    console.log('Checking for Bank/Card Mismatches...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, bank, card_name, url, title');

    if (error || !data) {
        console.error(error);
        return;
    }

    const cardToBank: Record<string, string> = {
        'Wings': 'Akbank',
        'Axess': 'Akbank',
        'Free': 'Akbank',
        'World': 'Yapı Kredi',
        'Adios': 'Yapı Kredi',
        'Play': 'Yapı Kredi',
        'Crystal': 'Yapı Kredi',
        'Maximum': 'İş Bankası',
        'Maximiles': 'İş Bankası',
        'Paraf': 'Halkbank',
        'Bankkart': 'Ziraat',
        'Bonus': 'Garanti BBVA',
        'Miles&Smiles': 'Garanti BBVA',
        'Shop&Fly': 'Garanti BBVA'
    };

    const issues = data.filter((c: any) => {
        const expectedBank = cardToBank[c.card_name];
        return expectedBank && expectedBank !== c.bank;
    });

    console.log(`Found ${issues.length} mismatches:\n`);

    issues.forEach((c: any) => {
        const expectedBank = cardToBank[c.card_name];
        console.log(`- [${c.id}] Card: ${c.card_name} | Actual Bank: ${c.bank} | Expected Bank: ${expectedBank}`);
        console.log(`  URL: ${c.url}`);
        console.log('---');
    });
}

checkBankCardMismatches();
