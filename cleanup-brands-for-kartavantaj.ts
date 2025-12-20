/**
 * Brand Data Cleanup Script for Kartavantaj
 * Run this in your kartavantaj project to clean up brand data
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // or NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function normalizeBrands(brandData: any): string[] {
    if (!brandData) return [];

    let brands: string[] = [];

    // If already array
    if (Array.isArray(brandData)) {
        brands = brandData;
    }
    // If string (shouldn't happen but handle it)
    else if (typeof brandData === 'string') {
        // Try to parse if it looks like JSON
        if (brandData.startsWith('[')) {
            try {
                brands = JSON.parse(brandData);
            } catch {
                brands = [brandData];
            }
        } else {
            brands = [brandData];
        }
    }

    // Clean each brand
    return brands
        .map(b => {
            if (typeof b !== 'string') return String(b);

            // Remove quotes
            let cleaned = b.replace(/^["']|["']$/g, '').trim();

            return cleaned;
        })
        .filter(b => b && b !== '""' && b !== "''") // Remove empty
        .flatMap(b => {
            // Split comma-separated
            if (b.includes(',')) {
                return b.split(',')
                    .map(x => x.trim())
                    .filter(x => x && x !== '""' && x !== "''");
            }
            return [b];
        });
}

async function cleanupBrands() {
    console.log('🧹 Starting brand cleanup...\n');

    // Fetch all campaigns
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, brand');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!campaigns) {
        console.log('No campaigns found');
        return;
    }

    console.log(`📊 Found ${campaigns.length} campaigns\n`);

    let updated = 0;
    let skipped = 0;

    for (const campaign of campaigns) {
        const originalBrand = campaign.brand;
        const cleanedBrand = normalizeBrands(originalBrand);

        // Check if cleanup is needed
        const needsCleanup =
            !Array.isArray(originalBrand) ||
            JSON.stringify(originalBrand) !== JSON.stringify(cleanedBrand);

        if (needsCleanup) {
            const { error: updateError } = await supabase
                .from('campaigns')
                .update({ brand: cleanedBrand })
                .eq('id', campaign.id);

            if (updateError) {
                console.error(`❌ Failed to update ${campaign.title}:`, updateError);
            } else {
                console.log(`✅ Updated: ${campaign.title}`);
                console.log(`   Before: ${JSON.stringify(originalBrand)}`);
                console.log(`   After:  ${JSON.stringify(cleanedBrand)}\n`);
                updated++;
            }
        } else {
            skipped++;
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total:   ${campaigns.length}\n`);
}

cleanupBrands().catch(console.error);
