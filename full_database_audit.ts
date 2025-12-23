import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function runFullAudit() {
    console.log('🚀 Starting Full Database Audit...\n');

    // 1. Basic Stats
    const { count: totalCount } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true });

    const { count: activeCount } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

    const { count: approvedCount } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('is_approved', true);

    console.log('📊 Overall Stats:');
    console.log(`- Total Campaigns (in DB): ${totalCount}`);
    console.log(`- Active (is_active):     ${activeCount}`);
    console.log(`- Approved (is_approved): ${approvedCount}`);
    console.log('─'.repeat(40));

    // 2. Missing Fields Stats
    console.log('\n🔍 Missing/Incomplete Fields (Across ALL Campaigns):');

    const { data: allData, error: fetchError } = await supabase
        .from('campaigns')
        .select('id, title, bank, brand, sector_slug, category, image, valid_until, description, ai_parsing_incomplete');

    if (fetchError || !allData) {
        console.error('❌ Failed to fetch data for audit:', fetchError?.message);
        return;
    }

    const stats = {
        noBrand: 0,
        noSector: 0,
        noCategory: 0,
        noImage: 0,
        noUntil: 0,
        noDescription: 0,
        aiIncomplete: 0
    };

    allData.forEach(c => {
        if (!c.brand || c.brand.trim() === '' || c.brand.toLowerCase().includes('genel')) stats.noBrand++;
        if (!c.sector_slug || c.sector_slug === 'diger') stats.noSector++;
        if (!c.category || c.category === 'Diğer') stats.noCategory++;
        if (!c.image || c.image.includes('placehold')) stats.noImage++;
        if (!c.valid_until) stats.noUntil++;
        if (!c.description || c.description.trim() === '' || c.description.length < 10) stats.noDescription++;
        if (c.ai_parsing_incomplete) stats.aiIncomplete++;
    });

    const total = allData.length;
    console.log(`- Missing/Generic Brand: ${stats.noBrand} (${Math.round((stats.noBrand / total) * 100)}%)`);
    console.log(`- Missing/Other Sector:  ${stats.noSector} (${Math.round((stats.noSector / total) * 100)}%)`);
    console.log(`- Missing/Other Category: ${stats.noCategory} (${Math.round((stats.noCategory / total) * 100)}%)`);
    console.log(`- Missing/Bad Image:     ${stats.noImage} (${Math.round((stats.noImage / total) * 100)}%)`);
    console.log(`- Missing End Date:      ${stats.noUntil} (${Math.round((stats.noUntil / total) * 100)}%)`);
    console.log(`- Missing Description:   ${stats.noDescription} (${Math.round((stats.noDescription / total) * 100)}%)`);
    console.log(`- AI Incomplete:         ${stats.aiIncomplete} (${Math.round((stats.aiIncomplete / total) * 100)}%)`);
    console.log('─'.repeat(40));

    // 3. Breakdown by Bank
    console.log('\n🏦 Issues by Bank:');
    const banks: Record<string, { total: number, missingBrand: number, missingSector: number }> = {};
    allData.forEach(c => {
        if (!banks[c.bank]) banks[c.bank] = { total: 0, missingBrand: 0, missingSector: 0 };
        banks[c.bank].total++;
        if (!c.brand || c.brand.trim() === '' || c.brand.toLowerCase().includes('genel')) banks[c.bank].missingBrand++;
        if (!c.sector_slug || c.sector_slug === 'diger') banks[c.bank].missingSector++;
    });

    console.log(`| Bank | Total | Missing Brand | Missing Sector |`);
    console.log(`|------|-------|---------------|----------------|`);
    Object.entries(banks).sort((a, b) => b[1].total - a[1].total).forEach(([name, stats]) => {
        console.log(`| ${name.padEnd(15)} | ${stats.total.toString().padEnd(5)} | ${stats.missingBrand.toString().padEnd(13)} | ${stats.missingSector.toString().padEnd(14)} |`);
    });

    // 4. Sample Issues
    console.log('\n⚠️  Sample Problematic Campaigns (Missing Brand or Sector):');
    const problems = allData.filter(c => !c.brand || c.brand.trim() === '' || c.brand.toLowerCase().includes('genel') || !c.sector_slug || c.sector_slug === 'diger').slice(0, 10);

    if (problems.length > 0) {
        problems.forEach(p => {
            console.log(`- [#${p.id}] ${p.title} (${p.bank}) | Brand: "${p.brand || 'MISSING'}" | Sector: "${p.sector_slug || 'MISSING'}"`);
        });
    } else {
        console.log('None found in current sample.');
    }

    console.log('\n✅ Audit Complete.');
}

runFullAudit().catch(err => console.error('❌ Audit Failed:', err));
