import { supabase } from '../src/utils/supabase';
import { generateSectorSlug } from '../src/utils/slugify';

async function fixBulkData() {
    console.log('🚀 Starting Bulk Categorization Correction...');

    // 1. Fix Brand: "Genel" for campaigns that have merchant names in title
    // (This is a simplified version of the logic, targeting obvious cases)
    const { data: misbranded } = await supabase
        .from('campaigns')
        .select('id, title, brand')
        .eq('brand', 'Genel');

    console.log(`🔍 Checking ${misbranded?.length || 0} campaigns with brand "Genel"...`);

    // 2. Fix Categories: "Diğer" or "Genel" based on title keywords
    const { data: miscategorized } = await supabase
        .from('campaigns')
        .select('id, title, category')
        .in('category', ['Diğer', 'Genel', 'Market', 'Yakıt', 'Giyim & Moda', 'Seyahat']);

    console.log(`🔍 Checking ${miscategorized?.length || 0} campaigns with potentially wrong categories...`);

    const remapping: Record<string, string> = {
        'Market': 'Market & Gıda',
        'Yakıt': 'Akaryakıt',
        'Giyim & Moda': 'Giyim & Aksesuar',
        'Seyahat': 'Turizm & Konaklama'
    };

    let fixedCount = 0;

    if (miscategorized) {
        for (const c of miscategorized) {
            let newCat = remapping[c.category] || c.category;
            const titleLower = c.title.toLowerCase();

            if (newCat === 'Diğer' || newCat === 'Genel') {
                if (titleLower.includes('market') || titleLower.includes('gıda')) newCat = 'Market & Gıda';
                else if (titleLower.includes('giyim') || titleLower.includes('moda') || titleLower.includes('aksesuar')) newCat = 'Giyim & Aksesuar';
                else if (titleLower.includes('akaryakıt') || titleLower.includes('benzin') || titleLower.includes('yakıt')) newCat = 'Akaryakıt';
                else if (titleLower.includes('restoran') || titleLower.includes('yemek') || titleLower.includes('kafe')) newCat = 'Restoran & Kafe';
                else if (titleLower.includes('seyahat') || titleLower.includes('tatil') || titleLower.includes('uçak') || titleLower.includes('otel')) newCat = 'Turizm & Konaklama';
                else if (titleLower.includes('elektronik') || titleLower.includes('teknoloji')) newCat = 'Elektronik';
            }

            if (newCat !== c.category) {
                const sectorSlug = generateSectorSlug(newCat);
                const { error } = await supabase
                    .from('campaigns')
                    .update({ category: newCat, sector_slug: sectorSlug })
                    .eq('id', c.id);

                if (!error) fixedCount++;
            }
        }
    }

    console.log(`✅ Fixed ${fixedCount} campaigns.`);
}

fixBulkData();
