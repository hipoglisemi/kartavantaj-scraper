
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkSectors() {
    const { data: sectors, error } = await supabase
        .from('master_sectors')
        .select('name, slug')
        .order('name');

    if (error) {
        console.error('Error fetching sectors:', error);
        return;
    }

    console.log('--- Current Sectors ---');
    sectors.forEach(s => {
        console.log(`[${s.slug}] ${s.name}`);
    });
}

checkSectors();
