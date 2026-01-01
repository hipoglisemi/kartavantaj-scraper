import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function fixCampaign16140() {
    console.log('\n🔧 Kampanya 16140 Düzeltiliyor...\n');

    // Fix the earning field
    const { error } = await supabase
        .from('campaigns')
        .update({
            earning: '7.500 TL Ekstre İndirimi',
            badge_text: 'İNDİRİM'  // Also update badge if it was wrong
        })
        .eq('id', 16140);

    if (error) {
        console.error('❌ Hata:', error.message);
        return;
    }

    console.log('✅ Kampanya 16140 düzeltildi!');

    // Verify the fix
    const { data } = await supabase
        .from('campaigns')
        .select('id, title, earning, badge_text, min_spend, max_discount')
        .eq('id', 16140)
        .single();

    console.log('\n📋 Güncel Değerler:');
    console.log(`   Earning: ${data?.earning}`);
    console.log(`   Badge: ${data?.badge_text}`);
    console.log(`   Min Spend: ${data?.min_spend} TL`);
    console.log(`   Max Discount: ${data?.max_discount} TL`);
}

fixCampaign16140();
