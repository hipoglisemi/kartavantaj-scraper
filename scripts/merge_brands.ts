
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const brandMergeMap: Record<string, string> = {
    // Monster
    'Monsternotebook': 'Monster',
    'Monster Notebook': 'Monster',

    // MediaMarkt
    'Mediamarkt': 'Media Markt',
    'MEDİA MARKT': 'Media Markt',
    'MEDIA MARKT': 'Media Markt',

    // DeFacto
    'Defacto': 'DeFacto',

    // IKEA
    'Ikea': 'IKEA',

    // Nine West
    'Ninewest': 'Nine West',

    // Pazarama
    'Pazaramatatil': 'Pazarama Tatil',

    // Tommy Hilfiger / Life
    'Tommylife': 'TommyLife',

    // Zorlu PSM
    'Zorlu Psm': 'Zorlu PSM',
    'Zorlu psm': 'Zorlu PSM',

    // Polo
    'U.s. Polo Assn': 'U.S. Polo Assn.',
    'U.s. Polo Assn.': 'U.S. Polo Assn.',

    // Vatan
    'Vatanbilgisayar': 'Vatan Bilgisayar',

    // Damat
    "D's Damat": "D'S Damat",
    "D'S damat": "D'S Damat",

    // bonVeno
    'Bonveno': 'bonVeno',

    // Total
    'Totalenergies': 'TotalEnergies',

    // SIXT
    'SIXT Rent': 'SIXT Rent a Car',
    'SIXT rent a car': 'SIXT Rent a Car',

    // Incehesap
    'İncehesap': 'İncehesap.com',
    'incehesap.com': 'İncehesap.com',

    // Masterpass
    'Masterpassplus': 'Masterpass',

    // Others
    'N11': 'n11',
    'n11.com': 'n11',
    'TrendyolMilla': 'Trendyolmilla',
    'Trendyol Milla': 'Trendyolmilla',
    'Trendyolmilla': 'TrendyolMilla', // Wait, let's stick to one. TrendyolMilla seems common.
};

// Re-adjust some
brandMergeMap['Trendyolmilla'] = 'TrendyolMilla';
brandMergeMap['Trendyol Milla'] = 'TrendyolMilla';

async function mergeBrands() {
    console.log('🚀 Marka Tekilleştirme Başlatılıyor...');

    // 1. Fetch campaigns
    const { data: campaigns } = await supabase.from('campaigns').select('id, brand');

    let campaignUpdateCount = 0;
    for (const campaign of campaigns || []) {
        if (!campaign.brand) continue;

        let currentBrand = campaign.brand;
        let needsUpdate = false;

        // Handle comma separated brands
        if (currentBrand.includes(',')) {
            const brands = currentBrand.split(',').map((b: string) => b.trim());
            const primaryBrand = brands[0]; // Logic: first one is primary
            if (primaryBrand !== currentBrand) {
                currentBrand = primaryBrand;
                needsUpdate = true;
            }
        }

        // Map to standard name
        if (brandMergeMap[currentBrand]) {
            currentBrand = brandMergeMap[currentBrand];
            needsUpdate = true;
        }

        if (needsUpdate) {
            const { error } = await supabase
                .from('campaigns')
                .update({ brand: currentBrand })
                .eq('id', campaign.id);

            if (!error) campaignUpdateCount++;
        }
    }
    console.log(`✅ ${campaignUpdateCount} kampanya markası güncellendi.`);

    // 2. Cleanup Master Brands
    const { data: masterBrands } = await supabase.from('master_brands').select('*');

    for (const mb of masterBrands || []) {
        const canonical = brandMergeMap[mb.name];
        if (canonical) {
            console.log(`🗑  Master Brand siliniyor: ${mb.name} -> ${canonical} olarak birleşti.`);
            await supabase.from('master_brands').delete().eq('id', mb.id);
        }
    }

    // Standardize remaining master brands (unique check)
    const { data: finalBrands } = await supabase.from('master_brands').select('*');
    const seen = new Set();
    for (const fb of finalBrands || []) {
        if (seen.has(fb.name.toLowerCase())) {
            console.log(`🗑  Mükerrer Master Brand siliniyor: ${fb.name}`);
            await supabase.from('master_brands').delete().eq('id', fb.id);
        } else {
            seen.add(fb.name.toLowerCase());
        }
    }

    console.log('🏁 Marka temizliği tamamlandı.');
}

mergeBrands();
