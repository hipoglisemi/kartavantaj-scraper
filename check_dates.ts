import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkDates() {
    const { data } = await supabase
        .from('campaigns')
        .select('id, title, valid_from, valid_until')
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum')
        .not('valid_until', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n📅 Kampanya Tarihleri:\n');
    data?.forEach((c: any) => {
        const start = new Date(c.valid_from);
        const end = new Date(c.valid_until);
        
        console.log(`${c.title.substring(0, 50)}`);
        console.log(`   Başlangıç: ${start.toLocaleDateString('tr-TR')}`);
        console.log(`   Bitiş: ${end.toLocaleDateString('tr-TR')}`);
        console.log(`   Raw: ${c.valid_until}\n`);
    });
}

checkDates();
