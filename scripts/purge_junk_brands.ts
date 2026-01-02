import * as dotenv from 'dotenv';
import { supabase } from '../src/utils/supabase';

dotenv.config();

async function runCleaner() {
    console.log('🚀 Starting Junk Brand Cleanup...');

    const junkTerms = [
        'mobilya', 'sigorta', 'world', 'yapı', 'nalburiye', 'juzdan',
        'jüzdan', 'worldpuan', 'puan', 'taksit', 'indirim', 'kampanya',
        'fırsat', 'troy', 'visa', 'mastercard', 'express', 'bonus',
        'maximum', 'axess', 'bankkart', 'paraf', 'card', 'kredi kartı',
        'nakit', 'chippin', 'adios', 'play', 'wings', 'free', 'black',
        'mil', 'chip-para', 'tl', 'ödeme', 'alisveris', 'alişveriş',
        'bonusflaş', 'ayrıcalık', 'avantaj', 'pos', 'üye işyeri',
        'akaryakıt', 'giyim', 'aksesuar', 'elektronik', 'market', 'gıda',
        'restoran', 'kafe', 'e-ticaret', 'ulaşım', 'turizm', 'konaklama',
        'otomotiv', 'kamu', 'eğitim'
    ];

    for (const term of junkTerms) {
        console.log(`\nProcessing term: "${term}"...`);

        // 1. Find the junk brand(s)
        const { data: brands } = await supabase
            .from('master_brands')
            .select('id, name')
            .ilike('name', term);

        if (!brands || brands.length === 0) {
            console.log(`   ℹ️ No brand found for "${term}".`);
            continue;
        }

        for (const brand of brands) {
            console.log(`   🧹 Cleaning brand "${brand.name}" (${brand.id})...`);

            // 2. Update campaigns: Remove brand_id and brand name for these junk entries
            const { count, error: updateError } = await supabase
                .from('campaigns')
                .update({
                    brand_id: null,
                    brand: 'Genel' // Fallback to Genel if it's just a generic term
                })
                .eq('brand_id', brand.id);

            if (updateError) {
                console.error(`   ❌ Update error for "${brand.name}":`, updateError.message);
            } else {
                console.log(`   ✅ Updated campaigns.`);
            }

            // 3. Delete from master_brands
            const { error: deleteError } = await supabase
                .from('master_brands')
                .delete()
                .eq('id', brand.id);

            if (deleteError) {
                console.error(`   ❌ Delete error for "${brand.name}":`, deleteError.message);
            } else {
                console.log(`   ✅ Deleted from master_brands.`);
            }
        }
    }

    console.log('\n✨ Junk brand cleanup complete.');
}

runCleaner().catch(console.error);
