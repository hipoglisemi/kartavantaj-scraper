import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { isGenericCampaign } from './utils/genericDetector';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function testGenericDetection() {
    console.log('🔍 Testing Generic Campaign Detection...\n');

    // Fetch all campaigns
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, description, brand')
        .order('id', { ascending: false })
        .limit(20);

    if (!campaigns) {
        console.log('No campaigns found');
        return;
    }

    console.log(`Found ${campaigns.length} campaigns\n`);
    console.log('─'.repeat(80));

    let genericCount = 0;
    let brandedCount = 0;

    campaigns.forEach(c => {
        const isGeneric = isGenericCampaign(c);

        if (isGeneric) {
            genericCount++;
            console.log(`\n🏷️  GENERIC DETECTED:`);
            console.log(`   ID: ${c.id}`);
            console.log(`   Title: ${c.title}`);
            console.log(`   Current Brand: ${c.brand || 'NULL'}`);
            console.log(`   Should be: Genel`);
        } else {
            brandedCount++;
        }
    });

    console.log('\n' + '─'.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Generic Campaigns: ${genericCount}`);
    console.log(`   Branded Campaigns: ${brandedCount}`);
    console.log(`   Total: ${campaigns.length}`);
}

testGenericDetection();
