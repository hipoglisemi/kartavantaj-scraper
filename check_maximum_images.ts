import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkImages() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('title, image, url')
        .eq('card_name', 'Maximum')
        .ilike('title', '%Yolcu360%')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- SAVED MAXIMUM IMAGES ---');
    data.forEach(c => {
        console.log(`Title: ${c.title}`);
        console.log(`Image: ${c.image}`);
        console.log(`URL:   ${c.url}\n`);
    });
}

checkImages();
