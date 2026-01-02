import * as dotenv from 'dotenv';
import { supabase } from '../src/utils/supabase';

dotenv.config();

async function run() {
    const { data: sector } = await supabase
        .from('master_sectors')
        .select('id, name, slug')
        .ilike('name', 'Akaryakıt')
        .single();

    if (!sector) {
        console.error('Sector Akaryakıt not found');
        return;
    }

    console.log(`Checking sector: ${sector.name} (${sector.id}, ${sector.slug})`);

    // Campaigns with slug 'akaryakit'
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, sector_id, sector_slug')
        .eq('sector_slug', 'akaryakit');

    console.log(`Found ${campaigns?.length} campaigns with slug 'akaryakit'`);

    const mismatches = campaigns?.filter(c => c.sector_id !== sector.id) || [];
    console.log(`Mismatches (sector_id !== ${sector.id}): ${mismatches.length}`);

    for (const c of mismatches) {
        console.log(`- ID: ${c.id}, Title: ${c.title}, Current Sector ID: ${c.sector_id}`);
    }

    if (mismatches.length > 0) {
        console.log('\nFixing mismatches...');
        const { error } = await supabase
            .from('campaigns')
            .update({ sector_id: sector.id })
            .in('id', mismatches.map(m => m.id));

        if (error) console.error('Error fixing:', error.message);
        else console.log('Successfully updated sector_ids.');
    }
}

run().catch(console.error);
