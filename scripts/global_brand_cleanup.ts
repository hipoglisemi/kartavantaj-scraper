
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

/**
 * GENEL MARKA BİRLEŞTİRME HARİTASI
 * Sol taraf (Key): Sorunlu/Mükerrer isim
 * Sağ taraf (Value): Hedeflenen temiz/kanonik isim
 */
const globalBrandMergeMap: Record<string, string> = {
    // Electronics & Tech
    'Monsternotebook': 'Monster',
    'Monster Notebook': 'Monster',
    'Mediamarkt': 'Media Markt',
    'Medıamarkt': 'Media Markt',
    'MEDİA MARKT': 'Media Markt',
    'Vatanbilgisayar': 'Vatan Bilgisayar',
    'Vatan': 'Vatan Bilgisayar',
    'İncehesap': 'İncehesap.com',
    'incehesap.com': 'İncehesap.com',
    'itopya': 'İtopya',
    'Eera-itopya': 'İtopya',

    // Fashion & Shoes
    'Defacto': 'DeFacto',
    'In Street': 'In Street',
    'İnstreet': 'In Street',
    'instreet': 'In Street',
    'Ninewest': 'Nine West',
    'Tommylife': 'TommyLife',
    'Beymen Club': 'Beymen Club',
    'Beymen Club ': 'Beymen Club',
    'Zsazsazsu': 'Zsa Zsa Zsu',
    'Zsa Zsa Zsu': 'Zsa Zsa Zsu',
    'Superstep': 'SuperStep',
    'House Of Superstep': 'SuperStep',
    'Flormar': 'Flormar',

    // Market & E-Commerce
    'n11.com': 'n11',
    'N11': 'n11',
    'n11': 'n11',
    'TrendyolMilla': 'TrendyolMilla',
    'Trendyol Milla': 'TrendyolMilla',
    'Trendyol Dolap': 'Dolap',
    'Hepsiburada.com': 'Hepsiburada',
    'Pazaramatatil': 'Pazarama Tatil',
    'Pazarama Tatil': 'Pazarama Tatil',
    'Özdilekteyim': 'Özdilek',

    // Home & Life
    'Ikea': 'IKEA',
    'Mondihome': 'Mondi',
    'Mondihome ': 'Mondi',

    // Automotive
    'Totalenergies': 'TotalEnergies',
    'Total Energies': 'TotalEnergies',
    'Lastik.com.tr': 'Lastikcim',
    'Lastikcim': 'Lastikcim',

    // Services
    'Masterpassplus': 'Masterpass',
    'SIXT Rent': 'SIXT Rent a Car',
    'SIXT rent a car': 'SIXT Rent a Car',
};

async function runGlobalMerge() {
    console.log('🚀 Global Marka Tekilleştirme Başlatılıyor...');

    // 1. Kampanyaları Gözden Geçir (Tümünü Çek)
    const { data: campaigns, error: cError } = await supabase.from('campaigns').select('id, brand');
    if (cError) {
        console.error('Kampanyalar çekilemedi:', cError);
        return;
    }

    let campaignUpdates = 0;
    for (const campaign of campaigns || []) {
        if (!campaign.brand) continue;

        const originalBrands = campaign.brand.split(',').map((b: string) => b.trim()).filter(Boolean);
        let changed = false;

        const normalizedBrands = originalBrands.map((b: string) => {
            // Map'te varsa değiştir
            if (globalBrandMergeMap[b]) {
                changed = true;
                return globalBrandMergeMap[b];
            }
            // Title case normalization (basit)
            const lower = b.toLowerCase();
            if (globalBrandMergeMap[Object.keys(globalBrandMergeMap).find(k => k.toLowerCase() === lower) || '']) {
                changed = true;
                return globalBrandMergeMap[Object.keys(globalBrandMergeMap).find(k => k.toLowerCase() === lower) || ''];
            }
            return b;
        });

        const uniqueBrands = Array.from(new Set(normalizedBrands));
        if (uniqueBrands.length !== originalBrands.length) changed = true;

        if (changed) {
            const finalBrandString = uniqueBrands.join(', ');
            const { error: uError } = await supabase
                .from('campaigns')
                .update({ brand: finalBrandString })
                .eq('id', campaign.id);

            if (!uError) campaignUpdates++;
        }
    }
    console.log(`✅ ${campaignUpdates} kampanya markası başarıyla normalize edildi.`);

    // 2. Master Brands Listesini Temizle
    const { data: masterBrands } = await supabase.from('master_brands').select('*');

    let masterDeletions = 0;
    for (const mb of masterBrands || []) {
        const canonical = globalBrandMergeMap[mb.name];

        // Eğer bu isim bir canonical ismin "sorunlu" tarafındaysa sil
        if (canonical && canonical !== mb.name) {
            console.log(`🗑  Siliniyor: ${mb.name} -> Hedef: ${canonical}`);
            await supabase.from('master_brands').delete().eq('id', mb.id);
            masterDeletions++;
        }
    }

    // 3. Duplicate kontrolü (Case-insensitive)
    const { data: finalBrands } = await supabase.from('master_brands').select('*');
    const seen = new Set<string>();
    for (const fb of finalBrands || []) {
        const lower = fb.name.toLowerCase().replace(/\s/g, '');
        if (seen.has(lower)) {
            console.log(`🗑  Mükerrer Siliniyor (Case/Space Duplicate): ${fb.name}`);
            await supabase.from('master_brands').delete().eq('id', fb.id);
            masterDeletions++;
        } else {
            seen.add(lower);
        }
    }

    console.log(`✅ ${masterDeletions} hatalı/mükerrer Master Brand silindi.`);
    console.log('🏁 Global temizlik tamamlandı.');
}

runGlobalMerge();
