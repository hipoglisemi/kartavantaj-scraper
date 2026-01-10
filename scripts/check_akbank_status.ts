import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkAkbank() {
    console.log('🔍 checking recent Akbank campaigns...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name, publish_status, created_at, reference_url')
        .or('bank.ilike.Akbank,bank_id.eq.akbank')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} recent Akbank campaigns:\n`);
        data.forEach((c, i) => {
            const statusIcon = c.publish_status === 'AI_PUBLISHED' ? '🤖' : '📝';
            console.log(`${i + 1}. [${statusIcon} ${c.publish_status || 'DRAFT'}] ${c.title}`);
            console.log(`   ID: ${c.id} | Bank: ${c.bank} | Card: ${c.card_name}`);
            console.log(`   Created: ${c.created_at}`);
            console.log(`   URL: ${c.reference_url}\n`);
        });
    } else {
        console.log('No Akbank campaigns found matching the criteria.');
    }
}

checkAkbank();
