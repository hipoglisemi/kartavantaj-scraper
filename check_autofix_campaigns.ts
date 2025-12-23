import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function checkAutofixCampaigns() {
    const campaignIds = [7199, 7198, 7197, 7196, 7195, 7194, 7193, 7192, 7191, 7190];

    console.log('🔍 Checking auto-fix campaigns...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, raw_brand, brand_id, sector_id, ai_parsing_incomplete')
        .in('id', campaignIds)
        .order('id', { ascending: false });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`Found ${campaigns?.length} campaigns:\n`);

    campaigns?.forEach(camp => {
        console.log(`ID: ${camp.id}`);
        console.log(`Title: ${camp.title?.substring(0, 60)}...`);
        console.log(`Raw Brand: ${camp.raw_brand || 'NULL'}`);
        console.log(`Brand ID: ${camp.brand_id || 'NULL'}`);
        console.log(`Sector ID: ${camp.sector_id || 'NULL'}`);
        console.log(`AI Incomplete: ${camp.ai_parsing_incomplete}`);
        console.log('---');
    });

    // Check if these have brand/sector issues
    const missingBrand = campaigns?.filter(c => !c.brand_id);
    const missingSector = campaigns?.filter(c => !c.sector_id);

    console.log(`\n📊 Summary:`);
    console.log(`Missing brand_id: ${missingBrand?.length}`);
    console.log(`Missing sector_id: ${missingSector?.length}`);
    console.log(`Has raw_brand: ${campaigns?.filter(c => c.raw_brand).length}`);
}

checkAutofixCampaigns();
