import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkSpecific() {
    console.log('🔍 Checking latest 5 İş Bankası campaigns...');
    const { data } = await supabase.from('campaigns')
        .select('title, ai_marketing_text, badge_text, category, image_url, created_at')
        .eq('bank', 'İş Bankası')
        .order('created_at', { ascending: false })
        .limit(5);

    if (data && data.length > 0) {
        data.forEach(c => {
            const hasAI = c.ai_marketing_text ? '✅' : '❌';
            const hasBadge = c.badge_text ? '✅' : '❌';
            const hasProxy = c.image_url?.includes('supabase') ? '✅' : '❌';
            console.log(`- [${c.created_at}] ${c.title.substring(0, 30)}... | AI: ${hasAI} | Badge: ${hasBadge} | Proxy: ${hasProxy}`);
        });
    } else {
        console.log('❌ No campaigns found.');
    }
}
checkSpecific();
