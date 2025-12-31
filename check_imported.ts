import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkImported() {
    const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum');

    const { data: latest } = await supabase
        .from('campaigns')
        .select('id, title, created_at, min_spend, earning, image')
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n📊 Supabase Durumu:\n');
    console.log(`Toplam Maximum Kampanya: ${count}`);
    
    console.log('\n📋 Son 5 Kampanya:\n');
    latest?.forEach((c: any, i: number) => {
        console.log(`${i+1}. ${c.title.substring(0, 50)}`);
        console.log(`   ID: ${c.id}`);
        console.log(`   Tarih: ${new Date(c.created_at).toLocaleString('tr-TR')}`);
        console.log(`   Min Spend: ${c.min_spend || 'YOK'}`);
        console.log(`   Earning: ${c.earning || 'YOK'}`);
        console.log(`   Görsel: ${c.image ? '✅' : '❌'}\n`);
    });
}

checkImported();
