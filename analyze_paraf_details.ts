import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function analyze() {
    const { data } = await supabase
        .from('campaigns')
        .select('title, description, min_spend, earning, conditions')
        .eq('id', 16108)
        .single();

    if (!data) { console.log('Not found'); return; }

    console.log(`\n🔍 Details for [${16108}]:\n`);
    console.log(`Title: ${data.title}`);
    console.log(`Earn: ${data.earning} | Spend: ${data.min_spend}`);
    console.log(`\nDescription:\n${data.description}`);
    console.log(`\nConditions:\n${data.conditions?.join('\n')}`);
}
analyze();
