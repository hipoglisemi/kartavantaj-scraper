import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function analyzeMaximumData() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'İş Bankası')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
        console.error('Error or no data:', error);
        return;
    }

    const campaign = data[0];

    console.log('🔍 Detaylı Kampanya Analizi:\n');
    console.log('📌 Başlık:', campaign.title);
    console.log('🔗 URL:', campaign.url);
    console.log('\n=== KRİTİK ALANLAR ===');
    console.log('🖼️  image:', campaign.image || 'YOK');
    console.log('📝 description:', campaign.description?.substring(0, 100) || 'YOK');
    console.log('🎯 participation_method:', campaign.participation_method || 'YOK');
    console.log('📋 conditions:', JSON.stringify(campaign.conditions) || 'YOK');
    console.log('💳 valid_cards:', JSON.stringify(campaign.valid_cards) || 'YOK');
    console.log('💳 eligible_customers:', JSON.stringify(campaign.eligible_customers) || 'YOK');
    console.log('💳 eligible_cards:', JSON.stringify(campaign.eligible_cards) || 'YOK');
    console.log('\n=== AI ALANLARI ===');
    console.log('🏷️  brand:', campaign.brand || 'YOK');
    console.log('📂 category:', campaign.category || 'YOK');
    console.log('💰 min_spend:', campaign.min_spend);
    console.log('💰 max_discount:', campaign.max_discount);
    console.log('🎁 earning:', campaign.earning || 'YOK');
    console.log('🎁 discount:', campaign.discount || 'YOK');
    console.log('📅 valid_until:', campaign.valid_until || 'YOK');
    console.log('\n=== META ===');
    console.log('🤖 ai_method:', campaign.ai_method || 'YOK');
    console.log('🪙 ai_tokens:', campaign.ai_tokens || 'YOK');
    console.log('📅 created_at:', campaign.created_at);
}

analyzeMaximumData();
