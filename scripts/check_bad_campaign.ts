
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkCampaign() {
    const title = "Axess'e özel Taç ve Linens'te 250 TL chip-para!";

    const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('title, category, sector_slug')
        .eq('title', title)
        .maybeSingle();

    if (error) {
        console.error('Error fetching campaign:', error);
        return;
    }

    if (campaign) {
        console.log('--- Campaign Found ---');
        console.log(`Title: ${campaign.title}`);
        console.log(`Category: ${campaign.category}`);
        console.log(`Sector Slug: ${campaign.sector_slug}`);
    } else {
        console.log('Campaign not found.');
    }
}

checkCampaign();
