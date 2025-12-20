/**
 * Fix Installment Badge Text
 * Converts generic "TAKSİT" to specific installment info
 * Run this in kartavantaj-scraper to update Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

function extractInstallmentInfo(campaign: any): string | null {
    const { title, description, earning, discount } = campaign;

    // Combine all text fields
    const text = `${title || ''} ${description || ''} ${earning || ''} ${discount || ''}`.toLowerCase();

    // Pattern matching for installment info
    const patterns = [
        // "peşin fiyatına 6 taksit", "6 aya varan taksit"
        /peşin\s+fiyatına\s+(\d+)\s+(?:aya?\s+varan\s+)?taksit/i,
        /(\d+)\s+aya?\s+varan\s+taksit/i,
        /(\d+)\s+taksit/i,
        // "6 ay taksit", "9 aya kadar taksit"
        /(\d+)\s+ay(?:a)?\s+(?:kadar\s+)?taksit/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const months = match[1];

            // Check if it's "peşin fiyatına"
            if (text.includes('peşin fiyatına') || text.includes('peşin fiyatina')) {
                return `Peşin Fiyatına ${months} Taksit`;
            }

            // Check if it's "varan"
            if (text.includes('varan') || text.includes('kadar')) {
                return `${months} Aya Varan Taksit`;
            }

            // Default
            return `${months} Taksit`;
        }
    }

    // If no specific number found, check for generic installment mentions
    if (text.includes('taksit')) {
        // Try to extract from title more carefully
        const titleMatch = title?.match(/(\d+)\s*taksit/i);
        if (titleMatch) {
            return `${titleMatch[1]} Taksit`;
        }

        // Keep as is if we can't determine
        return null;
    }

    return null;
}

async function fixInstallmentBadges() {
    console.log('\n🔧 Fixing Installment Badge Text...\n');
    console.log('='.repeat(80));

    // Fetch campaigns with TAKSİT badge but generic text
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('provider', 'World Card (Yapı Kredi)')
        .eq('badge_text', 'TAKSİT');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No campaigns with TAKSİT badge found');
        return;
    }

    console.log(`📊 Found ${campaigns.length} campaigns with TAKSİT badge\n`);

    let updated = 0;
    let skipped = 0;

    for (const campaign of campaigns) {
        const installmentInfo = extractInstallmentInfo(campaign);

        if (installmentInfo && installmentInfo !== 'TAKSİT') {
            console.log(`\n🔄 ${campaign.title}`);
            console.log(`   Current: TAKSİT`);
            console.log(`   New:     ${installmentInfo}`);

            const { error: updateError } = await supabase
                .from('campaigns')
                .update({
                    earning: installmentInfo // Update earning field with installment info
                })
                .eq('id', campaign.id);

            if (updateError) {
                console.error(`   ❌ Failed: ${updateError.message}`);
            } else {
                console.log(`   ✅ Updated`);
                updated++;
            }
        } else {
            console.log(`⏭️  Skipped: ${campaign.title} (no specific installment info found)`);
            skipped++;
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📝 Total:   ${campaigns.length}\n`);
}

fixInstallmentBadges().catch(console.error);
