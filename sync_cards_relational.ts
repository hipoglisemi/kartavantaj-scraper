
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function syncCards() {
    console.log('🔄 Syncing cards from bank_configs to cards table...');

    const { data: bankConfigs, error: fetchError } = await supabase
        .from('bank_configs')
        .select('*');

    if (fetchError) {
        console.error('❌ Error fetching bank_configs:', fetchError);
        return;
    }

    const { data: banks, error: banksError } = await supabase
        .from('banks')
        .select('*');

    if (banksError) {
        console.error('❌ Error fetching banks:', banksError);
        return;
    }

    for (const config of bankConfigs) {
        // Find corresponding bank in 'banks' table using slug (bank_id)
        const bank = banks.find(b => b.slug === config.bank_id);
        if (!bank) {
            console.warn(`⚠️ Bank with slug ${config.bank_id} not found in 'banks' table. Skipping cards sync for this bank.`);
            continue;
        }

        const cardsArray = config.cards || [];
        console.log(`🏦 Bank: ${config.bank_name} (ID: ${bank.id}) - Found ${cardsArray.length} cards in JSON.`);

        for (const cardJson of cardsArray) {
            console.log(`   🃏 Syncing card: ${cardJson.name} (slug: ${cardJson.id})`);

            const { error: upsertError } = await supabase
                .from('cards')
                .upsert({
                    bank_id: bank.id,
                    name: cardJson.name,
                    slug: cardJson.id,
                    image_url: cardJson.logo
                }, { onConflict: 'bank_id,name' });

            if (upsertError) {
                console.error(`      ❌ Error syncing ${cardJson.name}:`, upsertError.message);
            } else {
                console.log(`      ✅ Card ${cardJson.name} synced.`);
            }
        }
    }

    console.log('\n✨ Sync completed!');
}

syncCards().catch(console.error);
