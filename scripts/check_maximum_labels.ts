import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkLabels() {
    console.log('🔍 Checking card labels for İş Bankası campaigns...');
    const { data, error } = await supabase.from('campaigns')
        .select('title, card_name, card_id, bank_id')
        .eq('bank', 'İş Bankası')
        .limit(20);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        data.forEach((c, i) => {
            console.log(`- [${c.card_id}] Label: "${c.card_name}" | Title: ${c.title.substring(0, 30)}...`);
        });
    } else {
        console.log('❌ No campaigns found.');
    }
}
checkLabels();
