import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function runMigration() {
    console.log('🔄 Starting manual migration for Operators...');

    const EXISTING_BANK_ID = 33; // We found this via query

    // 1. Fix Bank Slug (operatr -> operator)
    const { error: errFix } = await supabase.from('banks')
        .update({ slug: 'operator' })
        .eq('id', EXISTING_BANK_ID);

    if (errFix) console.error('❌ Error updating bank slug:', errFix);
    else console.log('✅ Bank slug corrected to "operator"');


    // 2. master_banks (ID is integer, auto-inc)
    // Check if operator exists in master_banks
    const { data: existingMaster } = await supabase.from('master_banks').select('*').eq('slug', 'operator').single();
    if (!existingMaster) {
        // Since ID is integer auto-inc, we just insert name/slug
        const { error: err1 } = await supabase.from('master_banks').insert({
            name: 'Operatör', slug: 'operator'
        });
        if (err1) console.error('❌ master_banks error:', err1);
        else console.log('✅ master_banks inserted');
    } else {
        console.log('ℹ️  master_banks entry already exists');
    }

    // 3. cards (ID is integer)
    let cardId: number | null = null;
    const { data: existingCard } = await supabase.from('cards').select('id').eq('slug', 'turkcell').single();

    if (existingCard) {
        cardId = existingCard.id;
        console.log(`ℹ️  Card 'Turkcell' already exists with ID: ${cardId}`);
    } else {
        const { data: newCard, error: err3 } = await supabase.from('cards').insert({
            name: 'Turkcell',
            slug: 'turkcell',
            bank_id: EXISTING_BANK_ID,
            image_url: '/logos/cards/operatorturkcell.png'
        }).select('id').single();

        if (err3 || !newCard) {
            console.error('❌ cards error:', err3);
        } else {
            cardId = newCard.id;
            console.log(`✅ Created Card 'Turkcell' with ID: ${cardId}`);
        }
    }

    // 4. bank_configs
    const configData = {
        bank_id: 'operator',
        bank_name: 'Operatör',
        cards: [
            { id: "turkcell", name: "Turkcell", slug: "turkcell" }
        ],
        aliases: ["turkcell", "operatör", "operatorler", "turkcell avantaj"]
    };

    const { error: err4 } = await supabase.from('bank_configs').upsert(
        configData,
        { onConflict: 'bank_id' }
    );

    if (err4) console.error('❌ bank_configs error:', err4);
    else console.log('✅ bank_configs updated');
}

runMigration();
