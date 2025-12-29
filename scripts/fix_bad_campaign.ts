
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateSectorSlug } from '../src/utils/slugify';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function fixCampaign() {
    const title = "Axess'e özel Taç ve Linens'te 250 TL chip-para!";
    const correctCategory = "Mobilya & Dekorasyon";
    const correctSlug = generateSectorSlug(correctCategory);

    const { data, error } = await supabase
        .from('campaigns')
        .update({
            category: correctCategory,
            sector_slug: correctSlug
        })
        .eq('title', title)
        .select();

    if (error) {
        console.error('Error fixing campaign:', error);
    } else if (data && data.length > 0) {
        console.log(`✅ Campaign fixed!`);
        console.log(`Title: ${data[0].title}`);
        console.log(`New Category: ${data[0].category}`);
        console.log(`New Slug: ${data[0].sector_slug}`);
    } else {
        console.log('Campaign not found to update.');
    }
}

fixCampaign();
