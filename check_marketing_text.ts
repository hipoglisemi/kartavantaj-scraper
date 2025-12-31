import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkMarketingText() {
    const { data } = await supabase
        .from('campaigns')
        .select('id, title, marketing_text')
        .eq('id', 15869)
        .single();

    console.log('\n📋 ID 15869 - Marketing Text:\n');
    console.log(`Başlık: ${data?.title}`);
    console.log(`\nMarketing Text:\n${data?.marketing_text || 'YOK'}`);
}

checkMarketingText();
