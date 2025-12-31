import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function getImageIds() {
    const { data } = await supabase
        .from('campaigns')
        .select('id, title, image, created_at')
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum')
        .not('image', 'is', null)
        .not('image', 'eq', '')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log('\n📸 Görselli Maximum Kampanyalar:\n');
    data?.forEach((c: any) => {
        const hasRealImage = !c.image.includes('favicon') && !c.image.includes('placeholder');
        if (hasRealImage) {
            console.log(`ID: ${c.id}`);
            console.log(`   ${c.title.substring(0, 50)}`);
            console.log(`   ${c.image}`);
            console.log(`   ${c.created_at}\n`);
        }
    });
}

getImageIds();
