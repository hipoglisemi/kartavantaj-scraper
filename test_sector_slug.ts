import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function testSectorSlug() {
    console.log('🔍 Testing sector_slug generation...\n');

    // Test cases
    const testCategories = [
        'Market & Gıda',
        'Restoran & Kafe',
        'Giyim & Aksesuar',
        'Eğitim',
        'Akaryakıt',
        'Mobilya & Dekorasyon'
    ];

    console.log('📋 Category → sector_slug mapping:\n');
    testCategories.forEach(category => {
        const slug = category
            .toLowerCase()
            .replace(/\s*&\s*/g, '-')
            .replace(/\s+/g, '-')
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        console.log(`${category.padEnd(25)} → ${slug}`);
    });

    // Check if existing campaigns have sector_slug
    console.log('\n\n🔍 Checking existing campaigns...\n');
    const { data, error } = await supabase
        .from('campaigns')
        .select('category, sector_slug')
        .limit(5);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log('Sample campaigns:');
    data?.forEach((campaign, i) => {
        const hasSlug = campaign.sector_slug ? '✅' : '❌';
        console.log(`${i + 1}. ${hasSlug} ${campaign.category || 'N/A'} → ${campaign.sector_slug || 'MISSING'}`);
    });
}

testSectorSlug();
