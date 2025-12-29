/**
 * Test ID Mapper
 * Creates a test campaign to verify ID mapping works
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { lookupIDs } from './utils/idMapper';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function testIDMapper() {
    console.log('🧪 Testing ID Mapper...\n');

    // Test data
    const testBank = 'Akbank';
    const testCard = 'Axess';
    const testBrand = 'Migros';
    const testSector = 'market-gida';

    console.log('📝 Input:');
    console.log(`   Bank: ${testBank}`);
    console.log(`   Card: ${testCard}`);
    console.log(`   Brand: ${testBrand}`);
    console.log(`   Sector: ${testSector}\n`);

    // Lookup IDs
    console.log('🔍 Looking up IDs...');
    const ids = await lookupIDs(testBank, testCard, testBrand, testSector);

    console.log('\n✅ Result:');
    console.log(`   bank_id: ${ids.bank_id || 'NOT FOUND'}`);
    console.log(`   card_id: ${ids.card_id || 'NOT FOUND'}`);
    console.log(`   brand_id: ${ids.brand_id || 'NOT FOUND'}`);
    console.log(`   sector_id: ${ids.sector_id || 'NOT FOUND'}\n`);

    // Create a test campaign
    const testCampaign = {
        title: 'TEST - ID Mapper Verification',
        description: 'Bu bir test kampanyasıdır',
        bank: testBank,
        card_name: testCard,
        brand: testBrand,
        sector_slug: testSector,
        category: 'Market & Gıda',
        url: 'https://test.com/test-' + Date.now(),
        reference_url: 'https://test.com/test-' + Date.now(),
        is_active: false, // Mark as inactive so it doesn't show in production
        ...ids // Spread the IDs
    };

    console.log('💾 Creating test campaign in database...');
    const { data, error } = await supabase
        .from('campaigns')
        .insert(testCampaign)
        .select()
        .single();

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log('\n✅ Test campaign created successfully!');
    console.log(`   Campaign ID: ${data.id}`);
    console.log(`   Title: ${data.title}`);
    console.log(`   bank_id: ${data.bank_id}`);
    console.log(`   card_id: ${data.card_id}`);
    console.log(`   brand_id: ${data.brand_id}`);
    console.log(`   sector_id: ${data.sector_id}`);

    // Verify all IDs are populated
    const allIDsPresent = data.bank_id && data.card_id && data.brand_id && data.sector_id;

    if (allIDsPresent) {
        console.log('\n🎉 SUCCESS! All IDs were correctly mapped!');
    } else {
        console.log('\n⚠️  WARNING: Some IDs are missing!');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test campaign...');
    await supabase.from('campaigns').delete().eq('id', data.id);
    console.log('✅ Test campaign deleted\n');
}

testIDMapper();
