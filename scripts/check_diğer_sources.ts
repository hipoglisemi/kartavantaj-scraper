import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkOtherBankSources() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, url, reference_url, created_at')
        .eq('bank', 'Diğer');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Total 'Diğer' Bank Campaigns: ${data.length}\n`);

    data.forEach((c: any) => {
        console.log(`- [${c.id}] ${c.title}`);
        console.log(`  URL: ${c.url}`);
        console.log(`  Ref URL: ${c.reference_url}`);
        console.log(`  Created: ${c.created_at}`);
        console.log('---');
    });
}

checkOtherBankSources();
