import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function analyze() {
    const { data } = await supabase
        .from('campaigns')
        .select('title, description, min_spend, max_discount, earning, conditions')
        .eq('id', 16068)
        .single();

    if (!data) {
        console.log('Kampanya bulunamadı.');
        return;
    }

    console.log(`\n🔍 Kampanya Analizi [16068]:\n`);
    console.log(`Başlık: ${data.title}`);
    console.log(`Earning: ${data.earning}`);
    console.log(`Min Spend: ${data.min_spend}`);
    console.log(`\n📖 Açıklama:\n${data.description}`);
    console.log(`\n📋 Koşullar:\n${data.conditions?.join('\n')}`);
}

analyze();
