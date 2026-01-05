import { lookupIDs } from './src/utils/idMapper';
import * as dotenv from 'dotenv';
dotenv.config();

async function testMapper() {
    console.log('🧪 Testing idMapper Fuzzy Logic...');

    const tests = [
        { brand: 'Migros', category: 'Market', expectedBrand: 'Migros', expectedSector: 'Market & Gıda' },
        { brand: 'Shell', category: 'Akaryakıt', expectedBrand: 'Shell', expectedSector: 'Akaryakıt' },
        { brand: 'Teknosa', category: 'Elektronik', expectedBrand: 'Teknosa', expectedSector: 'Elektronik' },
        { brand: 'H&M', category: 'Giyim', expectedBrand: 'H&M', expectedSector: 'Giyim & Aksesuar' },
    ];

    for (const t of tests) {
        console.log(`\n🔍 Searching: ${t.brand} / ${t.category}`);
        const ids = await lookupIDs('Yapı Kredi', 'Worldcard', t.brand, undefined, t.category);
        console.log(`   IDs: Brand=${ids.brand_id}, Sector=${ids.sector_id}`);
        if (ids.brand_id && ids.sector_id) {
            console.log('   ✅ Match Found!');
        } else {
            console.log('   ❌ Match Failed!');
        }
    }
}

testMapper().catch(console.error);
