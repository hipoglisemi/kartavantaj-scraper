import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function main() {
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Total campaigns in database: ${count}`);

    // Get first 10 campaigns by created_at
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, created_at')
        .order('created_at', { ascending: true })
        .limit(10);

    console.log(`\n✅ First 10 campaigns:`);
    campaigns?.forEach((c, i) => {
        console.log(`${i + 1}. ID ${c.id}: ${c.title}`);
    });

    if (count && count > 10) {
        console.log(`\n⚠️  Found ${count} campaigns, but we only want 10.`);
        console.log(`Would you like to delete the excess ${count - 10} campaigns? (Y/n)`);
    }
}

main().catch(console.error);
