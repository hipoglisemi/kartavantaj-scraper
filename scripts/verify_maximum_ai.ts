import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkLatest() {
    console.log('🔍 Checking latest 2 İş Bankası campaigns in DB...');
    const { data, error } = await supabase.from('campaigns')
        .select('*')
        .eq('bank', 'İş Bankası')
        .order('created_at', { ascending: false })
        .limit(2);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        data.forEach((c, i) => {
            console.log(`\n--- Campaign ${i + 1} ---`);
            console.log(`Title: ${c.title}`);
            console.log(`Description: ${c.description}`);
            console.log(`Marketing Text: ${c.ai_marketing_text}`);
            console.log(`Badge: ${c.badge_text} (${c.badge_color})`);
            console.log(`Category: ${c.category}`);
            console.log(`Image Proxy: ${c.image_url}`);
            console.log(`Conditions (first 2): ${c.conditions?.slice(0, 2).join(' | ')}`);
        });
    } else {
        console.log('❌ No campaigns found.');
    }
}
checkLatest();
