import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkMaximumCampaigns() {
    const { data: campaigns, count } = await supabase
        .from('campaigns')
        .select('id, title, image, created_at', { count: 'exact' })
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log(`\n📊 Maximum Kampanya Durumu\n`);
    console.log(`Toplam: ${count} kampanya\n`);

    console.log('Son 10 Kampanya:');
    campaigns?.forEach((c: any, i: number) => {
        const hasImage = c.image && c.image.length > 0 && !c.image.includes('favicon');
        console.log(`${i + 1}. ${c.title.substring(0, 50)}`);
        console.log(`   Görsel: ${hasImage ? '✅ Var' : '❌ YOK'}`);
        console.log(`   URL: ${c.image || 'null'}`);
        console.log(`   Tarih: ${c.created_at}`);
        console.log('');
    });
}

checkMaximumCampaigns();
