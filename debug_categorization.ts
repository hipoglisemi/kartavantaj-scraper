import { supabase } from './src/utils/supabase';

async function checkData() {
    console.log('--- Master Sectors ---');
    const { data: sectors } = await supabase.from('master_sectors').select('name, slug');
    console.log(sectors);

    console.log('\n--- Total Statistics ---');
    const { count: totalCount } = await supabase.from('campaigns').select('*', { count: 'exact', head: true });
    console.log('Total Campaigns:', totalCount);

    const { data: brandGenelCount } = await supabase.from('campaigns').select('id', { count: 'exact' }).eq('brand', 'Genel');
    console.log('Brand "Genel" Count:', (brandGenelCount as any)?.length || 0);

    const { data: catDigerCount } = await supabase.from('campaigns').select('id', { count: 'exact' }).eq('category', 'Diğer');
    console.log('Category "Diğer" Count:', (catDigerCount as any)?.length || 0);

    const { data: catGenelCount } = await supabase.from('campaigns').select('id', { count: 'exact' }).eq('category', 'Genel');
    console.log('Category "Genel" Count:', (catGenelCount as any)?.length || 0);

    console.log('\n--- Sample Campaigns (Any) ---');
    const { data: samples } = await supabase.from('campaigns').select('id, title, brand, category, sector_slug').limit(10);
    samples?.forEach(c => {
        console.log(`ID: ${c.id} | Title: ${c.title.substring(0, 50)}...`);
        console.log(`   Brand: ${c.brand} | Category: ${c.category} | Sector: ${c.sector_slug}`);
    });

    console.log('\n--- Brand Stats ---');
    const { data: brands } = await supabase.from('master_brands').select('name').limit(10);
    console.log('First 10 master brands:', brands?.map(b => b.name));
}

checkData();
