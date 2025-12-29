import { supabase } from '../src/utils/supabase';

async function checkBrandIssues() {
    const { data } = await supabase
        .from('campaigns')
        .select('id, title, category, brand, merchant')
        .order('id', { ascending: false });

    if (!data) return;

    console.log('═'.repeat(60));
    console.log('1. DİĞER KATEGORİSİNDEKİ KAMPANYALAR');
    console.log('═'.repeat(60));

    const digerCampaigns = data.filter(c => c.category === 'Diğer');
    console.log(`\nToplam: ${digerCampaigns.length} kampanya\n`);

    digerCampaigns.slice(0, 15).forEach((c, i) => {
        console.log(`${i + 1}. ID ${c.id}: ${c.title.substring(0, 60)}`);
        console.log(`   Merchant: ${c.merchant || 'YOK'}`);
        console.log(`   Brand: ${JSON.stringify(c.brand)}`);
    });

    console.log('\n' + '═'.repeat(60));
    console.log('2. KART İSİMLERİ BRAND ALANINDA');
    console.log('═'.repeat(60));

    const cardNames = ['Axess', 'Wings', 'Bonus', 'Free', 'Juzdan', 'World', 'Play', 'Crystal'];
    const invalidBrands = data.filter(c => {
        if (!c.brand) return false;
        const brands = typeof c.brand === 'string' ? c.brand.split(',').map((s: string) => s.trim()) : c.brand;
        return brands.some((b: string) =>
            cardNames.some(card => b.toLowerCase().includes(card.toLowerCase()))
        );
    });

    console.log(`\nToplam: ${invalidBrands.length} kampanya\n`);
    invalidBrands.slice(0, 15).forEach((c, i) => {
        console.log(`${i + 1}. ID ${c.id}: ${c.title.substring(0, 50)}`);
        console.log(`   Brand: ${JSON.stringify(c.brand)}`);
    });

    console.log('\n' + '═'.repeat(60));
    console.log('3. UZUN MARKA İSİMLERİ (50+ karakter)');
    console.log('═'.repeat(60));

    const longBrands = data.filter(c => {
        if (!c.brand) return false;
        const brands = typeof c.brand === 'string' ? c.brand.split(',').map((s: string) => s.trim()) : c.brand;
        return brands.some((b: string) => b.length > 50);
    });

    console.log(`\nToplam: ${longBrands.length} kampanya\n`);
    longBrands.forEach((c, i) => {
        console.log(`${i + 1}. ID ${c.id}: ${c.title.substring(0, 50)}`);
        const brands = typeof c.brand === 'string' ? c.brand.split(',').map((s: string) => s.trim()) : c.brand;
        brands.forEach((b: string) => {
            if (b.length > 50) {
                console.log(`   Brand (${b.length} char): ${b}`);
            }
        });
    });

    console.log('\n' + '═'.repeat(60));
    console.log('4. TEKRAR EDEN MARKALAR');
    console.log('═'.repeat(60));

    const duplicateBrands = data.filter(c => {
        if (!c.brand || typeof c.brand === 'string') return false;
        return c.brand.length !== new Set(c.brand).size;
    });

    console.log(`\nToplam: ${duplicateBrands.length} kampanya\n`);
    duplicateBrands.slice(0, 10).forEach((c, i) => {
        console.log(`${i + 1}. ID ${c.id}: ${c.title.substring(0, 50)}`);
        console.log(`   Brand: ${JSON.stringify(c.brand)}`);
    });

    process.exit(0);
}

checkBrandIssues().catch(console.error);
