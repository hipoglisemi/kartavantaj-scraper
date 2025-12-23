import { createClient } from '@supabase/supabase-js';

// Using credentials from kartavantaj project
const SUPABASE_URL = 'https://bkqwfqvdqfcwfvvlbmhb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrcXdmcXZkcWZjd2Z2dmxibWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxODc3MjAsImV4cCI6MjA0OTc2MzcyMH0.Vy_cCrXMQNWRTqZvXPFjvO_ggxpNmJxJWVQNYXJQhJc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSectors() {
    console.log('📊 Fetching all sectors from Supabase...\n');

    const { data: sectors, error } = await supabase
        .from('sectors')
        .select('*')
        .order('name');

    if (error) {
        console.error('❌ Error fetching sectors:', error);
        return;
    }

    if (!sectors || sectors.length === 0) {
        console.log('⚠️  No sectors found in database');
        return;
    }

    console.log(`✅ Found ${sectors.length} sectors:\n`);
    console.log('='.repeat(100));

    sectors.forEach((sector, index) => {
        console.log(`\n${index + 1}. ${sector.name}`);
        console.log(`   Slug: ${sector.slug}`);
        console.log(`   Description: ${sector.description || 'N/A'}`);
        console.log(`   Keywords (${sector.keywords?.length || 0}): ${sector.keywords?.join(', ') || 'NONE'}`);
        console.log('-'.repeat(100));
    });

    // Check for problematic sectors
    console.log('\n\n🔍 ANALYSIS:\n');

    const problematicSectors = sectors.filter(s =>
        !s.keywords || s.keywords.length === 0
    );

    if (problematicSectors.length > 0) {
        console.log(`⚠️  ${problematicSectors.length} sectors have NO keywords:`);
        problematicSectors.forEach(s => console.log(`   - ${s.name} (${s.slug})`));
    }

    // Check for overly broad keywords
    const broadKeywords = ['yaşam', 'hayat', 'günlük', 'genel'];
    const sectorsWithBroadKeywords = sectors.filter(s =>
        s.keywords?.some(k => broadKeywords.includes(k.toLowerCase()))
    );

    if (sectorsWithBroadKeywords.length > 0) {
        console.log(`\n⚠️  ${sectorsWithBroadKeywords.length} sectors have BROAD keywords:`);
        sectorsWithBroadKeywords.forEach(s => {
            const broad = s.keywords?.filter(k => broadKeywords.includes(k.toLowerCase()));
            console.log(`   - ${s.name}: ${broad?.join(', ')}`);
        });
    }

    // Check for "Yaşam" sector specifically
    const yasamSector = sectors.find(s => s.name.toLowerCase().includes('yaşam') || s.slug === 'yasam');
    if (yasamSector) {
        console.log(`\n🎯 "Yaşam" Sector Details:`);
        console.log(`   Name: ${yasamSector.name}`);
        console.log(`   Slug: ${yasamSector.slug}`);
        console.log(`   Keywords: ${yasamSector.keywords?.join(', ') || 'NONE'}`);
        console.log(`   ⚠️  This sector might be too broad and catching unrelated campaigns`);
    }
}

checkSectors().catch(console.error);
