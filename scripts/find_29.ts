import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function findThe29Passive() {
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, is_active, is_approved, valid_until, created_at, url');

    if (error) {
        console.error(error);
        return;
    }

    // Frontend logic: isArchived = !is_active
    // showArchived filter likely shows those where is_active === false

    const passive = campaigns.filter(c => c.is_active === false);
    console.log(`count(is_active === false): ${passive.length}`);

    // Maybe they are defined by being unapproved?
    const unapproved = campaigns.filter(c => !c.is_approved);
    console.log(`count(!is_approved): ${unapproved.length}`);

    // Let's check for any other column we might have missed
    const sample = campaigns[0];
    console.log('Fields available:', Object.keys(sample));

    if (unapproved.length > 0) {
        console.log('\nSample Unapproved:');
        unapproved.slice(0, 5).forEach(c => console.log(`- [${c.id}] ${c.title} (Valid: ${c.valid_until}, Active: ${c.is_active})`));
    }
}

findThe29Passive();
