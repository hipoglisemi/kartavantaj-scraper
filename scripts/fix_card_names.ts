import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function fixCardNames() {
    console.log('Starting card name fix migration...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, bank, card_name, url, title');

    if (error || !data) {
        console.error(error);
        return;
    }

    let updateCount = 0;

    for (const campaign of data) {
        let newCardName = campaign.card_name;
        const url = (campaign.url || '').toLowerCase();
        const bank = (campaign.bank || '').toLowerCase();
        const currentCard = (campaign.card_name || '').toLowerCase();

        // Mapping logic
        if (url.includes('wingscard.com.tr')) newCardName = 'Wings';
        else if (url.includes('axess.com.tr')) newCardName = 'Axess';
        else if (url.includes('free.com.tr')) newCardName = 'Free';
        else if (url.includes('worldcard.com.tr')) newCardName = 'World';
        else if (url.includes('adioscard.com.tr')) newCardName = 'Adios';
        else if (url.includes('playcard.com.tr')) newCardName = 'Play';
        else if (url.includes('crystalcard.com.tr')) newCardName = 'Crystal';
        else if (url.includes('paraf.com.tr')) newCardName = 'Paraf';
        else if (url.includes('bankkart.com.tr')) newCardName = 'Bankkart';
        else if (url.includes('maximum.com.tr')) {
            if (url.includes('maximiles')) newCardName = 'Maximiles';
            else newCardName = 'Maximum';
        }

        // Special case for generic "Akbank Kartları" or empty if bank is Akbank
        if (bank === 'akbank' && (currentCard === '' || currentCard.includes('akbank'))) {
            if (url.includes('wings')) newCardName = 'Wings';
            else if (url.includes('axess')) newCardName = 'Axess';
            else if (url.includes('free')) newCardName = 'Free';
        }

        if (newCardName !== campaign.card_name) {
            console.log(`Fixing [${campaign.id}]: "${campaign.card_name}" -> "${newCardName}" (URL: ${campaign.url})`);
            const { error: updateError } = await supabase
                .from('campaigns')
                .update({ card_name: newCardName })
                .eq('id', campaign.id);

            if (updateError) {
                console.error(`Error updating ${campaign.id}:`, updateError);
            } else {
                updateCount++;
            }
        }
    }

    console.log(`\nMigration complete. Updated ${updateCount} campaigns.`);
}

fixCardNames();
