import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function prepare() {
    // 1. Get Operator Bank ID
    const { data: bank } = await supabase.from('banks').select('id, slug').eq('slug', 'operator').single();
    if (!bank) {
        console.error('❌ Bank "Operatör" not found! Run migration first.');
        return;
    }
    console.log(`✅ Bank Found: Operatör (ID: ${bank.id})`);

    // 2. Upsert Türk Telekom Card
    const { data: card, error } = await supabase.from('cards')
        .upsert({
            bank_id: bank.id,
            name: 'Türk Telekom',
            slug: 'turk-telekom', // Matches scraper constant
            image_url: '/logos/cards/operatorturktelekom.png',
            active: true
        }, { onConflict: 'slug' })
        .select()
        .single();

    if (error) console.error('❌ Card Error:', error.message);
    else console.log(`✅ Card Ready: ${card.name} (Slug: ${card.slug})`);
}
prepare();
