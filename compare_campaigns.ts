import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function compareCampaigns() {
    // Get campaigns 15869-15874 (perfect ones)
    const { data: perfect } = await supabase
        .from('campaigns')
        .select('id, title, created_at, min_spend, max_discount, earning, discount, participation_method, eligible_customers')
        .gte('id', 15869)
        .lte('id', 15874)
        .order('id', { ascending: true });

    // Get last 15 campaigns (V5 with errors)
    const { data: latest } = await supabase
        .from('campaigns')
        .select('id, title, created_at, min_spend, max_discount, earning, discount, participation_method, eligible_customers')
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum')
        .order('created_at', { ascending: false })
        .limit(15);

    console.log('\n📊 KUSURSUZ KAMPANYALAR (ID 15869-15874):\n');
    perfect?.forEach((c: any) => {
        console.log(`ID ${c.id}: ${c.title}`);
        console.log(`   Tarih: ${c.created_at}`);
        console.log(`   Min Spend: ${c.min_spend || 'YOK'}`);
        console.log(`   Max Discount: ${c.max_discount || 'YOK'}`);
        console.log(`   Earning: ${c.earning || 'YOK'}`);
        console.log(`   Discount: ${c.discount || 'YOK'}`);
        console.log(`   Participation: ${c.participation_method || 'YOK'}`);
        console.log(`   Cards: ${c.eligible_customers?.length || 0} kart\n`);
    });

    console.log('\n❌ HATALI KAMPANYALAR (Son 15):\n');
    latest?.slice(0, 5).forEach((c: any) => {
        console.log(`ID ${c.id}: ${c.title.substring(0, 40)}`);
        console.log(`   Tarih: ${c.created_at}`);
        console.log(`   Min Spend: ${c.min_spend || 'YOK ❌'}`);
        console.log(`   Max Discount: ${c.max_discount || 'YOK ❌'}`);
        console.log(`   Earning: ${c.earning || 'YOK ❌'}`);
        console.log(`   Cards: ${c.eligible_customers?.length || 0} kart\n`);
    });

    console.log('\n🔍 KAYNAK ANALİZİ:');
    if (perfect && perfect.length > 0) {
        const firstTime = new Date(perfect[0].created_at);
        const lastTime = new Date(perfect[perfect.length - 1].created_at);
        const diff = (lastTime.getTime() - firstTime.getTime()) / 1000;
        
        console.log(`İlk kampanya: ${firstTime.toLocaleTimeString('tr-TR')}`);
        console.log(`Son kampanya: ${lastTime.toLocaleTimeString('tr-TR')}`);
        console.log(`Toplam süre: ${diff.toFixed(0)} saniye`);
        console.log(`Kampanya başına: ${(diff / 6).toFixed(1)} saniye`);
        
        if (diff < 10) {
            console.log('\n✅ KAYNAK: GitHub Actions (toplu, hızlı)');
        } else if (diff > 30) {
            console.log('\n✅ KAYNAK: PC Import (yavaş, AI işlemeli)');
        }
    }
}

compareCampaigns();
