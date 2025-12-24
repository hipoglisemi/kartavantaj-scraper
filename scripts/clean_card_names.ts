
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { normalizeBankName, normalizeCardName } from '../src/utils/bankMapper';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const rogueMappings: Record<string, Record<string, string>> = {
    'akbank': {
        'bank\'o card axess': 'Axess',
        'wings black plus': 'Wings',
        'kobi kart': 'Business',
        'ticari kartlar': 'Business',
        'akbank kartları': 'Axess'
    },
    'iş bankası': {
        'maximum kart': 'Maximum',
        'maximiles': 'Maximum'
    },
    'halkbank': {
        'paraf platinum': 'Paraf',
        'paraf premium': 'Paraf',
        'parafly': 'Paraf'
    },
    'vakıfbank': {
        'ace kredi kartı': 'Vakıfbank World'
    }
};

const applyRogueMapping = (bank: string, card: string): string => {
    const bankLower = bank.toLowerCase();
    const cardLower = card.toLowerCase();
    const bankKey = Object.keys(rogueMappings).find(k => bankLower.includes(k));
    if (bankKey) {
        const mappings = rogueMappings[bankKey];
        const matchingRogue = Object.keys(mappings).find(r => cardLower.includes(r));
        if (matchingRogue) return mappings[matchingRogue];
    }
    return card;
};

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

        // --- STEP 2: Handle Card Names & Rogue Mappings ---
        const parts = finalCardName.split(',').map((p: string) => p.trim()).filter(Boolean);
        const mappedParts = parts.map((p: string) => applyRogueMapping(finalBank, p));
        const normalizedParts = await Promise.all(mappedParts.map((p: string) => normalizeCardName(finalBank, p)));

        // Deduplicate and join
        const uniqueParts = Array.from(new Set(normalizedParts));
        const joined = uniqueParts.join(', ');

        if (joined !== finalCardName) {
            console.log(`💳 Cleaning & Merging Cards: "${finalCardName}" -> "${joined}" [Bank: ${finalBank}, ID: ${campaign.id}]`);
            finalCardName = joined;
            needsUpdate = true;
        }

        // --- STEP 3: Fix Bank-Card Mismatches ---
        const bankLower = finalBank.toLowerCase();
        const cardLower = finalCardName.toLowerCase();

        // Generic Cross-Bank Fixes
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
