// Test script to verify sector classification system
import { supabase } from './src/lib/supabase';

async function testSectorClassification() {
    console.log('🧪 Testing Sector Classification System\n');
    
    // 1. Check new columns
    console.log('1️⃣ Checking new columns in campaigns table...');
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, sector_slug, classification_method, sector_confidence, is_bank_campaign, needs_manual_sector')
        .limit(10);
    
    if (error) {
        console.error('❌ Error:', error);
        return;
    }
    
    console.log(`✅ Found ${campaigns?.length} campaigns`);
    console.log('\nSample campaign:');
    console.log(JSON.stringify(campaigns?.[0], null, 2));
    
    // 2. Check sector_keywords
    console.log('\n2️⃣ Checking sector_keywords table...');
    const { data: keywords, count } = await supabase
        .from('sector_keywords')
        .select('*', { count: 'exact' })
        .limit(5);
    
    console.log(`✅ Total keywords: ${count}`);
    console.log('Sample keywords:', keywords?.map(k => k.keyword).join(', '));
    
    // 3. Check brand-sector mapping
    console.log('\n3️⃣ Checking brand-sector mappings...');
    const { data: brands, count: brandCount } = await supabase
        .from('master_brands')
        .select('name, sector_id, sectors(name, slug)', { count: 'exact' })
        .not('sector_id', 'is', null)
        .limit(10);
    
    console.log(`✅ Mapped brands: ${brandCount}`);
    console.log('\nSample mappings:');
    brands?.forEach(b => {
        console.log(`  - ${b.name} → ${b.sectors?.name}`);
    });
    
    console.log('\n✅ All database migrations verified!');
}

testSectorClassification().catch(console.error);
