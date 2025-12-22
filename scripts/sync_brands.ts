
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

function simpleSlugify(text: string) {
    return text.toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}


dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const NEW_BRANDS = [
    "Enza Home", "TommyLife", "Nike", "Barçın Spor", "Brooks Brothers",
    "Armağan Oyuncak", "PUMA", "Panço", "Avva", "Samsung", "Budget",
    "Bosch", "Jolly", "Divanev", "Puffy", "Ramsey", "Boyner", "S Sport Plus",
    "Gallery Crystal", "Netflix", "Damat Tween", "D'S damat", "Yargıcı",
    "Korkmaz", "Borusan EnBW Şarj", "Mılagron", "Pierre Cardin", "U.S. Polo Assn.",
    "Evidea", "bonVeno", "Madame Coco", "Özdilekteyim", "Metro",
    "Altınyıldız Classics", "DeFacto", "Beymen", "Cacharel", "Doping Hafıza",
    "Ofix", "Togo", "TotalEnergies", "Konyalı Saat", "Otomate.app",
    "Pazarama", "Trendyol", "Baymak", "Ritmik Genç Odası", "Lajivert",
    "Zorlu PSM", "A101", "Hotel Anatolia", "Kale", "SIXT rent a car",
    "Fenerium", "Konuşarak Öğren", "Siemens", "IKEA", "English Home"
];

async function addBrandsAndRefill() {
    console.log(`🔄 Adding ${NEW_BRANDS.length} new brands to Master list...`);

    // 1. Add to Master Brands
    let addedCount = 0;
    for (const name of NEW_BRANDS) {
        const slug = simpleSlugify(name);

        // Check if exists
        const { data: existing } = await supabase
            .from('master_brands')
            .select('id')
            .eq('name', name)
            .maybeSingle();

        if (!existing) {
            const { error } = await supabase.from('master_brands').insert({
                name: name,
                // created_at is automatic usually, but keeping explicit date is fine
                created_at: new Date().toISOString()
            });

            if (!error) {
                console.log(`   ✅ Added: ${name}`);
                addedCount++;
            } else {
                console.error(`   ❌ Failed to add ${name}: ${error.message}`);
            }
        } else {
            console.log(`   ⚠️ Exists: ${name}`);
        }
    }
    console.log(`🎉 Added ${addedCount} new brands.`);


    // 2. Re-populate Campaigns with NULL brands
    console.log('\n🔄 Re-scanning NULL brand campaigns to match new Master Brands...');

    // Fetch all master brands (refresh)
    const { data: allBrands } = await supabase.from('master_brands').select('name');
    if (!allBrands) return;

    // Sort by length desc to match longer names first (e.g. "D'S damat" before "Damat")
    const sortedBrands = allBrands.map(b => b.name).sort((a, b) => b.length - a.length);

    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, bank')
        .is('brand', null); // Only check those we blanked out or missed

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No campaigns with missing brands found.');
        return;
    }

    console.log(`🔍 Checking ${campaigns.length} campaigns...`);
    let fixedCount = 0;

    for (const c of campaigns) {
        if (!c.title) continue;
        const titleUpper = c.title.toLocaleUpperCase('tr-TR');

        // Find match in title
        const match = sortedBrands.find(brandName => {
            const brandUpper = brandName.toLocaleUpperCase('tr-TR');
            // Basic inclusion check. 
            // Improve: use regex boundaries if needed, but inclusion is mostly fine for full names
            return titleUpper.includes(brandUpper);
        });

        if (match) {
            console.log(`   🎯 ID ${c.id} [${c.bank}]: Title "${c.title.substring(0, 30)}..." -> Found "${match}"`);

            const { error } = await supabase
                .from('campaigns')
                .update({ brand: match, ai_enhanced: true })
                .eq('id', c.id);

            if (!error) fixedCount++;
        } else {
            // Fallback: Check for "Genel" keywords
            const titleLower = c.title.toLowerCase();
            const genericKeywords = [
                'marketlerde', 'akaryakıt', 'istasyon', 'giyim', 'mağaza',
                'restoran', 'kafe', 'tüm sektör', 'seçili sektör',
                'üye işyeri', 'pos', 'vade farksız', 'taksit', 'faizsiz', 'masrafsız',
                'alışveriş', 'harcama', 'ödeme', 'e-ticaret', 'online'
            ];

            if (genericKeywords.some(kw => titleLower.includes(kw))) {
                console.log(`   🔗 ID ${c.id} [${c.bank}]: Title "${c.title.substring(0, 30)}..." -> Assigned "Genel"`);

                const { error } = await supabase
                    .from('campaigns')
                    .update({ brand: 'Genel', ai_enhanced: true })
                    .eq('id', c.id);

                if (!error) fixedCount++;
            }
        }
    }

    console.log(`\n🎉 Re-assigned brands to ${fixedCount} campaigns.`);
}

addBrandsAndRefill();
