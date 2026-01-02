import * as dotenv from 'dotenv';
import { supabase } from '../src/utils/supabase';

dotenv.config();

async function mergeBrands(sourceName: string, targetName: string) {
    console.log(`\nMerging "${sourceName}" -> "${targetName}"...`);

    // 1. Get IDs
    const { data: targetBrand } = await supabase
        .from('master_brands')
        .select('id, name')
        .ilike('name', targetName)
        .single();

    const { data: sourceBrand } = await supabase
        .from('master_brands')
        .select('id, name')
        .ilike('name', sourceName)
        .single();

    if (!targetBrand) {
        console.error(`❌ Target brand "${targetName}" not found.`);
        return;
    }

    if (!sourceBrand) {
        console.log(`ℹ️ Source brand "${sourceName}" not found. Skipping.`);
        return;
    }

    if (sourceBrand.id === targetBrand.id) {
        console.log(`ℹ️ Same ID. Skipping.`);
        return;
    }

    // 2. Update campaigns
    const { data: updated, error: updateError, count } = await supabase
        .from('campaigns')
        .update({
            brand_id: targetBrand.id,
            brand: targetBrand.name
        })
        .eq('brand_id', sourceBrand.id)
        .select('id');

    if (updateError) {
        console.error(`❌ Update error:`, updateError.message);
        return;
    }

    console.log(`✅ Updated ${updated?.length || 0} campaigns.`);

    // 3. Delete source brand
    const { error: deleteError } = await supabase
        .from('master_brands')
        .delete()
        .eq('id', sourceBrand.id);

    if (deleteError) {
        console.error(`❌ Delete error:`, deleteError.message);
    } else {
        console.log(`✅ Deleted brand "${sourceName}".`);
    }
}

async function run() {
    const merges = [
        ['Amazon Prime', 'Amazon'],
        ['Amazon Prime Video', 'Amazon'],
        ['Migros Sanal Market', 'Migros'],
        ['Migros Hemen', 'Migros'],
        ['Macroonline', 'Macro Center'],
        ['Getir Yemek', 'Getir'],
        ['Getir Büyük', 'Getir'],
        ['Getir Su', 'Getir'],
        ['Yemeksepeti Market', 'Yemeksepeti'],
        ['Yemeksepeti Mahalle', 'Yemeksepeti'],
        ['Banabi', 'Yemeksepeti'],
        ['CarrefourSA Online', 'CarrefourSA'],
        ['Disney Plus', 'Disney+'],
        ['Netflix Türkiye', 'Netflix'],
        ['Trendyol Milla', 'Trendyol'],
        ['TrendyolMilla', 'Trendyol'],
        ['Trendyol Yemek', 'Trendyol'],
        ['Trendyol Hızlı Market', 'Trendyol'],
        ['Hepsiburada Market', 'Hepsiburada'],
        ['Hepsiexpress', 'Hepsiburada']
    ];

    for (const [source, target] of merges) {
        await mergeBrands(source, target);
    }

    console.log('\n✨ Brand merging complete.');
}

run().catch(console.error);
