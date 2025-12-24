import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkBankConfigs() {
    const { data, error } = await supabase
        .from('bank_configs')
        .select('*');

    if (error) {
        console.error(error);
        return;
    }

    data.forEach((bank: any) => {
        console.log(`Bank: ${bank.name}`);
        if (bank.cards) {
            bank.cards.forEach((card: any) => {
                console.log(`  - Card: ${card.name} (ID: ${card.id})`);
            });
        }
    });
}

checkBankConfigs();
