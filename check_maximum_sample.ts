import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkMaximumCampaigns() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'İş Bankası')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('📊 Son 3 Maximum Kampanyası:\n');
    data?.forEach((c, i) => {
        console.log(`\n=== Kampanya ${i + 1}: ${c.title} ===`);
        console.log(`🖼️  Image: ${c.image ? '✅ VAR' : '❌ YOK'} - ${c.image?.substring(0, 60)}...`);
        console.log(`📝 Description (${c.description?.length || 0} char): ${c.description?.substring(0, 100)}...`);
        console.log(`🎯 Participation: ${c.participation_method || 'YOK'}`);
        console.log(`📋 Conditions: ${c.conditions?.length || 0} items`);
        console.log(`🏷️  Brand: ${c.brand || 'YOK'}`);
        console.log(`💳 Valid Cards: ${c.valid_cards?.length || 0} items`);
    });
}

checkMaximumCampaigns();
