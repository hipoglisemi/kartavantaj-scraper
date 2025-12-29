import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function investigate14330() {
    console.log('🔍 Campaign 14330 (SUCCESS):');

    const { data: success } = await supabase
        .from('campaigns')
        .select('id, title, bank, bank_id, card_name, card_id, brand, brand_id, sector_slug, sector_id, created_at, updated_at')
        .eq('id', 14330)
        .single();

    if (success) {
        console.log(JSON.stringify(success, null, 2));

        if (success.updated_at) {
            const created = new Date(success.created_at);
            const updated = new Date(success.updated_at);
            const diff = updated.getTime() - created.getTime();
            console.log(`\n⏱️  Updated ${(diff / 1000).toFixed(2)}s after creation`);
        }
    }

    console.log('\n\n🔍 Campaign 14333 (FAILED):');

    const { data: failed } = await supabase
        .from('campaigns')
        .select('id, title, bank, bank_id, card_name, card_id, brand, brand_id, sector_slug, sector_id, created_at, updated_at')
        .eq('id', 14333)
        .single();

    if (failed) {
        console.log(JSON.stringify(failed, null, 2));
    }
}

investigate14330();
