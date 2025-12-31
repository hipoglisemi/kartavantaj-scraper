import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkMaximumImages() {
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, image, url')
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('🖼️  Maximum Kampanya Görselleri\n');
    console.log('═══════════════════════════════════════\n');

    campaigns?.forEach((c: any, i: number) => {
        console.log(`${i + 1}. ${c.title}`);
        console.log(`   ID: ${c.id}`);
        console.log(`   Image URL: ${c.image}`);
        console.log(`   Campaign URL: ${c.url}`);
        console.log('');
    });
}

checkMaximumImages();
