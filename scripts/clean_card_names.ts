
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { normalizeBankName, normalizeCardName } from '../src/utils/bankMapper';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function cleanCardNames() {
    console.log('🧹 Starting Database Cleaning: Card Names & Bank Mappings...');

    // 1. Fetch all campaigns
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name, eligible_customers');

    if (error) {
        console.error('❌ Error fetching campaigns:', error);
        return;
    }

    console.log(`📊 Found ${campaigns.length} campaigns to analyze.`);

    let updateCount = 0;

    for (const campaign of campaigns) {
        let needsUpdate = false;
        let finalBank = campaign.bank;
        let finalCardName = campaign.card_name || '';

        // --- STEP 1: Normalize Bank Name ---
        const normalizedBank = await normalizeBankName(campaign.bank);
        if (normalizedBank !== campaign.bank) {
            console.log(`🏦 Correcting Bank: "${campaign.bank}" -> "${normalizedBank}" [ID: ${campaign.id}]`);
            finalBank = normalizedBank;
            needsUpdate = true;
        }

        // --- STEP 2: Handle Multiple Card Names (Comma separated) ---
        // We now support multiple cards in UI, but we want to ensure they are valid for the bank
        if (finalCardName.includes(',')) {
            const parts = finalCardName.split(',').map((p: string) => p.trim()).filter(Boolean);
            const normalizedParts = await Promise.all(parts.map((p: string) => normalizeCardName(finalBank, p)));

            // Deduplicate
            const uniqueParts = Array.from(new Set(normalizedParts));
            const joined = uniqueParts.join(', ');

            if (joined !== finalCardName) {
                console.log(`🗂️  Cleaning Multiple Cards: "${finalCardName}" -> "${joined}" [ID: ${campaign.id}]`);
                finalCardName = joined;
                needsUpdate = true;
            }
        } else if (finalCardName) {
            // Single card normalization
            const normalizedCard = await normalizeCardName(finalBank, finalCardName);
            if (normalizedCard !== finalCardName) {
                console.log(`💳 Normalizing Card: "${finalCardName}" -> "${normalizedCard}" [Bank: ${finalBank}, ID: ${campaign.id}]`);
                finalCardName = normalizedCard;
                needsUpdate = true;
            }
        }

        // --- STEP 3: Fix Bank-Card Mismatches (Cross-check) ---
        // Example: If bank is 'Garanti BBVA' but card is 'Wings'
        const bankLower = finalBank.toLowerCase();
        const cardLower = finalCardName.toLowerCase();

        if (bankLower.includes('garanti') && cardLower.includes('wings')) {
            console.log(`⚠️  FOUND MISMATCH: Garanti + Wings. Fixing to Bonus. [ID: ${campaign.id}]`);
            finalCardName = 'Bonus';
            needsUpdate = true;
        }

        if (bankLower.includes('akbank') && cardLower.includes('bonus')) {
            console.log(`⚠️  FOUND MISMATCH: Akbank + Bonus. Fixing to Axess. [ID: ${campaign.id}]`);
            finalCardName = 'Axess';
            needsUpdate = true;
        }

        // Update if anything changed
        if (needsUpdate) {
            const { error: updateError } = await supabase
                .from('campaigns')
                .update({
                    bank: finalBank,
                    card_name: finalCardName
                })
                .eq('id', campaign.id);

            if (updateError) {
                console.error(`❌ Failed to update campaign ${campaign.id}:`, updateError);
            } else {
                updateCount++;
            }
        }
    }

    console.log(`✨ DONE! Updated ${updateCount} campaigns.`);
}

cleanCardNames();
