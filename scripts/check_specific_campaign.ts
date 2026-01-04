import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkSpecific() {
    // Check the "Kahve Dünyası" campaign from screenshot
    const { data, error } = await supabase
        .from('campaigns')
        .select('title, ai_marketing_text, description, earning')
        .eq('bank', 'Chippin')
        .ilike('title', '%Kahve Dünyası%')
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('📋 Campaign Data:\n');
    console.log('Title:', data.title);
    console.log('\n🎯 ai_marketing_text:');
    console.log(`"${data.ai_marketing_text}"`);
    console.log(`(${data.ai_marketing_text?.split(/\s+/).length || 0} words)`);

    console.log('\n📝 description:');
    console.log(`"${data.description?.substring(0, 200)}..."`);
    console.log(`(${data.description?.split(/\s+/).length || 0} words)`);

    console.log('\n💰 earning:');
    console.log(`"${data.earning}"`);
}

checkSpecific();
