import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function fixCardNames() {
    console.log('Starting enhanced card and bank name fix migration...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('*');

    if (error || !data) {
        console.error(error);
        return;
    }

    let updateCount = 0;

    const cardToBank: Record<string, string> = {
        'Wings': 'Akbank',
        'Axess': 'Akbank',
        'Free': 'Akbank',
        'World': 'Yapı Kredi',
        'Adios': 'Yapı Kredi',
        'Play': 'Yapı Kredi',
        'Crystal': 'Yapı Kredi',
        'Maximum': 'İş Bankası',
        'Maximiles': 'İş Bankası',
        'Paraf': 'Halkbank',
        'Bankkart': 'Ziraat',
        'Bonus': 'Garanti BBVA',
        'Miles&Smiles': 'Garanti BBVA',
        'Shop&Fly': 'Garanti BBVA'
    };

    for (const campaign of data) {
        let newCardName = campaign.card_name;
        let newBank = campaign.bank;
        const url = (campaign.url || '').toLowerCase();
        const currentCard = (campaign.card_name || '').toLowerCase();
        const currentBank = (campaign.bank || '').toLowerCase();

        // 1. Infer Card from URL
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

        // 2. Infer Card from redundant or generic names if URL contains keywords
        if (currentCard === '' || currentCard === currentBank || currentCard.includes('kartları')) {
            if (url.includes('wings')) newCardName = 'Wings';
            else if (url.includes('axess')) newCardName = 'Axess';
            else if (url.includes('free')) newCardName = 'Free';
            else if (url.includes('play')) newCardName = 'Play';
            else if (url.includes('paraf')) newCardName = 'Paraf';
        }

        // 3. ENFORCE Bank based on Card Brand
        if (cardToBank[newCardName]) {
            newBank = cardToBank[newCardName];
        }

        // 4. Cleanup redundant card names (if card name is just the bank name, and we couldn't infer better)
        // But only if it's NOT in our cardToBank map.
        if (newCardName.toLowerCase() === newBank.toLowerCase() && !cardToBank[newCardName]) {
            newCardName = ''; // Force it to be empty so UI can fallback or user can see it's missing
        }

        // Check if anything changed
        if (newCardName !== campaign.card_name || newBank !== campaign.bank) {
            console.log(`Fixing [${campaign.id}]:`);
            if (campaign.card_name !== newCardName) console.log(`  Card: "${campaign.card_name}" -> "${newCardName}"`);
            if (campaign.bank !== newBank) console.log(`  Bank: "${campaign.bank}" -> "${newBank}"`);
            console.log(`  URL: ${campaign.url}`);

            const { error: updateError } = await supabase
                .from('campaigns')
                .update({
                    card_name: newCardName,
                    bank: newBank
                })
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
