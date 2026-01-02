import * as dotenv from 'dotenv';
import { supabase } from '../src/utils/supabase';

dotenv.config();

function normalizeBrandName(name: string): string {
    if (!name) return '';
    let cleanName = name
        .replace(/\.com\.tr|\.com|\.net|\.org/gi, '')
        .replace(/\s+notebook$|\s+market$|\s+marketleri$|[\s-]online$|[\s-]türkiye$|[\s-]turkiye$/gi, '')
        .trim();
    const lower = cleanName.toLowerCase();
    if (lower.includes('amazon')) return 'Amazon';
    if (lower.includes('migros') || lower === 'sanal market') return 'Migros';
    if (lower.startsWith('getir')) return 'Getir';
    if (lower.includes('yemeksepeti') || lower === 'banabi') return 'Yemeksepeti';
    if (lower.includes('carrefoursa') || lower.includes('carrefour')) return 'CarrefourSA';
    if (lower.includes('netflix')) return 'Netflix';
    if (lower.includes('disney')) return 'Disney+';
    if (lower === 'monsternotebook') return 'Monster';
    if (lower === 'mediamarkt') return 'Media Markt';
    if (lower === 'trendyolmilla' || lower === 'trendyol man') return 'Trendyol';
    if (lower === 'hepsiburada') return 'Hepsiburada';
    if (lower === 'n11') return 'n11';
    return cleanName; // Simplified for audit
}

async function run() {
    const { data: brands } = await supabase
        .from('master_brands')
        .select('id, name');

    if (!brands) return;

    const normalizedMap = new Map<string, Array<{ id: string, name: string }>>();

    for (const b of brands) {
        const norm = normalizeBrandName(b.name).toLowerCase();
        if (!normalizedMap.has(norm)) normalizedMap.set(norm, []);
        normalizedMap.get(norm)!.push(b);
    }

    console.log('--- Brand Duplication Audit ---\n');

    for (const [norm, list] of normalizedMap.entries()) {
        if (list.length > 1) {
            console.log(`Potential Duplicates for "${norm}":`);
            list.forEach(item => console.log(`  - ${item.name} (${item.id})`));

            // Auto-merge: pick the shortest name as master
            const master = list.reduce((prev, curr) => prev.name.length <= curr.name.length ? prev : curr);
            const targets = list.filter(item => item.id !== master.id);

            console.log(`  -> Recommended Master: ${master.name}`);

            for (const t of targets) {
                console.log(`  -> Merging ${t.name} into ${master.name}...`);
                const { error: updateError } = await supabase
                    .from('campaigns')
                    .update({ brand_id: master.id, brand: master.name })
                    .eq('brand_id', t.id);

                if (updateError) console.error(`     ❌ Update error: ${updateError.message}`);
                else {
                    const { error: deleteError } = await supabase
                        .from('master_brands')
                        .delete()
                        .eq('id', t.id);
                    if (deleteError) console.error(`     ❌ Delete error: ${deleteError.message}`);
                    else console.log(`     ✅ Merged and deleted ${t.name}`);
                }
            }
            console.log();
        }
    }
}

run().catch(console.error);
