import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkCampaign() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', 16140)
        .single();

    if (error) {
        console.error('❌ Hata:', error.message);
        return;
    }

    console.log('\n📋 Kampanya ID 16140 Detayları:\n');
    console.log(`Başlık: ${data.title}`);
    console.log(`URL: ${data.url}`);
    console.log(`\n💰 Matematiksel Değerler:`);
    console.log(`   Min Spend: ${data.min_spend} TL`);
    console.log(`   Max Discount: ${data.max_discount} TL`);
    console.log(`   Earning: ${data.earning}`);
    console.log(`   Discount Rate: ${data.discount_rate || 'YOK'}`);

    console.log(`\n🔍 Hesaplama Kontrolü:`);

    // Check 1: Min spend should be positive
    if (data.min_spend < 0) {
        console.log('   ❌ Min spend negatif!');
    } else {
        console.log(`   ✅ Min spend pozitif: ${data.min_spend} TL`);
    }

    // Check 2: Max discount should not exceed min spend
    if (data.max_discount > data.min_spend) {
        console.log(`   ❌ HATA: Max discount (${data.max_discount} TL) > Min spend (${data.min_spend} TL)`);
    } else {
        console.log(`   ✅ Max discount ≤ Min spend`);
    }

    // Check 3: Earning should match max_discount
    const earningMatch = data.earning && data.earning.includes(data.max_discount.toString());
    if (earningMatch) {
        console.log(`   ✅ Earning matches max_discount`);
    } else {
        console.log(`   ⚠️  Earning (${data.earning}) doesn't match max_discount (${data.max_discount})`);
    }

    // Show raw HTML to check original data
    console.log(`\n📄 Orijinal Kampanya Metni:`);
    const rawData = JSON.parse(require('fs').readFileSync('vakifbank_kampanyalar_raw.json', 'utf-8'));
    const campaign = rawData.find((c: any) => c.url === data.reference_url);
    if (campaign) {
        console.log(`\nTitle: ${campaign.title}`);
        console.log(`\nHTML içeriğinden ilk 500 karakter:`);
        console.log(campaign.detail_html.substring(0, 500));
    }
}

checkCampaign();
