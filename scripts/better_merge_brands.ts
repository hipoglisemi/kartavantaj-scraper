
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const brandMergeMap: Record<string, string> = {
    'Monsternotebook': 'Monster',
    'Monster Notebook': 'Monster',
    'Mediamarkt': 'Media Markt',
    'MEDİA MARKT': 'Media Markt',
    'MEDIA MARKT': 'Media Markt',
    'Defacto': 'DeFacto',
    'Ikea': 'IKEA',
    'Ninewest': 'Nine West',
    'Pazaramatatil': 'Pazarama Tatil',
    'Tommylife': 'TommyLife',
    'Zorlu Psm': 'Zorlu PSM',
    'U.s. Polo Assn': 'U.S. Polo Assn.',
    'U.s. Polo Assn.': 'U.S. Polo Assn.',
    'Vatanbilgisayar': 'Vatan Bilgisayar',
    "D's Damat": "D'S Damat",
    "D'S damat": "D'S Damat",
    'Bonveno': 'bonVeno',
    'Totalenergies': 'TotalEnergies',
    'İncehesap': 'İncehesap.com',
    'incehesap.com': 'İncehesap.com',
    'Masterpassplus': 'Masterpass',
    'N11': 'n11',
    'n11.com': 'n11',
    'TrendyolMilla': 'TrendyolMilla',
    'Trendyol Milla': 'TrendyolMilla',
    'Çiçeksepeti': 'Çiçeksepeti',
    'Çiçek Sepeti': 'Çiçeksepeti',
};

async function betterMerge() {
    console.log('🚀 Gelişmiş Marka Birleştirme Başlatılıyor...');

    const { data: campaigns } = await supabase.from('campaigns').select('id, brand, title, description');

    let updateCount = 0;
    for (const campaign of campaigns || []) {
        if (!campaign.brand) continue;

        const brands = campaign.brand.split(',').map((b: string) => b.trim()).filter(Boolean);

        let changed = false;
        const normalizedBrands = brands.map((b: string) => {
            const canonical = brandMergeMap[b];
            if (canonical && canonical !== b) {
                changed = true;
                return canonical;
            }
            return b;
        });

        // Ensure uniqueness
        const uniqueBrands = Array.from(new Set(normalizedBrands));
        if (uniqueBrands.length !== brands.length) changed = true;

        if (changed) {
            const finalBrand = uniqueBrands.join(', ');
            console.log(`   📝 Güncelleniyor [${campaign.id}]: ${campaign.brand} -> ${finalBrand}`);
            const { error } = await supabase
                .from('campaigns')
                .update({ brand: finalBrand })
                .eq('id', campaign.id);

            if (!error) updateCount++;
        }
    }

    console.log(`✅ ${updateCount} kampanya düzeltildi.`);
}

betterMerge();
