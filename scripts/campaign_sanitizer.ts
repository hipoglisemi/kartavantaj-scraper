import { supabase } from '../src/utils/supabase';
import { generateSectorSlug } from '../src/utils/slugify';

async function sanitizeData() {
    console.log('🧹 Starting Background Campaign Sanitizer...');

    // 1. Fetch Master Data
    const { data: masterBrands } = await supabase.from('master_brands').select('id, name');
    const { data: masterSectors } = await supabase.from('master_sectors').select('id, name, slug');
    const { data: sectorKeywords } = await supabase.from('sector_keywords').select('sector_id, keyword, weight').eq('is_active', true);

    // 2. Fetch Brand -> Sector Statistics (Majority Vote Learning)
    const { data: brandStats } = await supabase
        .from('campaigns')
        .select('brand, category')
        .not('brand', 'is', null)
        .not('category', 'is', null)
        .not('category', 'in', '("Diğer", "Genel")');

    const brandToSectorMap: Record<string, string> = {};
    if (brandStats) {
        const counts: Record<string, Record<string, number>> = {};
        brandStats.forEach(s => {
            if (!s.brand) return;
            const brands = Array.isArray(s.brand)
                ? s.brand
                : s.brand.split(',').map((b: string) => b.trim());
            brands.forEach((b: string) => {
                if (!counts[b]) counts[b] = {};
                counts[b][s.category] = (counts[b][s.category] || 0) + 1;
            });
        });

        // Determine majority sector for each brand
        for (const [brand, catCounts] of Object.entries(counts)) {
            let maxCount = 0;
            let bestCat = '';
            for (const [cat, count] of Object.entries(catCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    bestCat = cat;
                }
            }
            brandToSectorMap[brand] = bestCat;
        }
    }

    if (!masterBrands || !masterSectors) {
        console.error('❌ Failed to fetch master data');
        return;
    }

    // 2. Fetch miscategorized campaigns or all active ones
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, description, brand, category, sector_slug')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (!campaigns) return;

    console.log(`🔍 Auditing ${campaigns.length} campaigns...`);

    let fixedCount = 0;

    for (const campaign of campaigns) {
        let updatedBrand = campaign.brand;
        let updatedCategory = campaign.category;
        let needsUpdate = false;

        const combinedText = `${campaign.title} ${campaign.description || ''}`.toLowerCase();

        // BRAND SANITIZATION
        // Only attempt to fix if brand is empty or "Genel"
        if (!campaign.brand || campaign.brand === 'Genel' || campaign.brand === '') {
            const foundBrands: string[] = [];
            for (const mb of masterBrands) {
                const escapedBrand = mb.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedBrand}\\b`, 'i');
                if (regex.test(combinedText)) {
                    foundBrands.push(mb.name);
                }
            }

            if (foundBrands.length > 0) {
                updatedBrand = foundBrands.join(', ');
                needsUpdate = true;
            }
        }

        // SECTOR SANITIZATION
        // If brand is found, or category is "Diğer"/"Genel"/"null"
        if (!updatedCategory || updatedCategory === 'Diğer' || updatedCategory === 'Genel') {
            // Priority 1: Brand-to-Sector Mapping (Learned from DB)
            let firstBrand = '';
            if (updatedBrand) {
                if (Array.isArray(updatedBrand)) {
                    firstBrand = updatedBrand[0] || '';
                } else {
                    firstBrand = updatedBrand.split(',')[0].trim();
                }
            }
            if (firstBrand && brandToSectorMap[firstBrand]) {
                const mappedCat = brandToSectorMap[firstBrand];
                if (mappedCat !== updatedCategory) {
                    updatedCategory = mappedCat;
                    needsUpdate = true;
                }
            } else {
                // Priority 2: Keyword-based scoring (only if brand mapping fails)
                const scores: Record<string, number> = {};
                masterSectors.forEach(s => scores[s.id] = 0);

                if (sectorKeywords) {
                    for (const kw of sectorKeywords) {
                        if (combinedText.includes(kw.keyword.toLowerCase())) {
                            scores[kw.sector_id] = (scores[kw.sector_id] || 0) + (kw.weight || 1);
                        }
                    }
                }

                // Find best sector
                let bestSectorId = '';
                let maxScore = 0;
                for (const [sId, score] of Object.entries(scores)) {
                    if (score > maxScore) {
                        maxScore = score;
                        bestSectorId = sId;
                    }
                }

                if (bestSectorId) {
                    const bestSector = masterSectors.find(s => s.id === bestSectorId);
                    if (bestSector && bestSector.name !== updatedCategory) {
                        updatedCategory = bestSector.name;
                        needsUpdate = true;
                    }
                }
            }
        }

        if (needsUpdate) {
            const sectorSlug = updatedCategory ? generateSectorSlug(updatedCategory) : campaign.sector_slug;
            const { error } = await supabase
                .from('campaigns')
                .update({
                    brand: updatedBrand,
                    category: updatedCategory,
                    sector_slug: sectorSlug,
                    auto_corrected: true
                })
                .eq('id', campaign.id);

            if (!error) {
                fixedCount++;
                // console.log(`   ✅ Fixed ID: ${campaign.id} -> Brand: ${updatedBrand}, Cat: ${updatedCategory}`);
            }
        }
    }

    console.log(`🏁 Sanitization complete. Fixed ${fixedCount} campaigns.`);
}

sanitizeData();
