#!/usr/bin/env node

/**
 * Bulk update script for remaining scrapers
 * Adds import, slug regeneration, and ID-based insert/update pattern
 */

const fs = require('fs');
const path = require('path');

const scrapers = [
    'src/scrapers/akbank/free.ts',
    'src/scrapers/akbank/wings.ts',
    'src/scrapers/garanti/bonus.ts',
    'src/scrapers/denizbank/denizbonus.ts',
    'src/scrapers/halkbank/paraf.ts',
    'src/scrapers/yapikredi/adios.ts',
    'src/scrapers/yapikredi/crystal.ts',
    'src/scrapers/yapikredi/play.ts',
    'src/scrapers/yapikredi/world.ts',
    'src/scrapers/vakifbank/world.ts',
    'src/scrapers/ziraat/bankkart.ts',
];

const ID_BASED_UPSERT_PATTERN = `
                // ID-BASED SLUG SYSTEM
                const { data: existing } = await supabase
                    .from('campaigns')
                    .select('id')
                    .eq('reference_url', fullUrl)
                    .single();

                if (existing) {
                    const finalSlug = generateCampaignSlug(title, existing.id);
                    const { error } = await supabase
                        .from('campaigns')
                        .update({ ...campaignData, slug: finalSlug })
                        .eq('id', existing.id);
                    if (error) {
                        console.error(\`      ❌ Update Error: \${error.message}\`);
                    } else {
                        console.log(\`      ✅ Updated: \${title} (\${finalSlug})\`);
                    }
                } else {
                    const { data: inserted, error: insertError } = await supabase
                        .from('campaigns')
                        .insert(campaignData)
                        .select('id')
                        .single();
                    if (insertError) {
                        console.error(\`      ❌ Insert Error: \${insertError.message}\`);
                    } else if (inserted) {
                        const finalSlug = generateCampaignSlug(title, inserted.id);
                        await supabase
                            .from('campaigns')
                            .update({ slug: finalSlug })
                            .eq('id', inserted.id);
                        console.log(\`      ✅ Inserted: \${title} (\${finalSlug})\`);
                    }
                }`;

function updateScraper(filePath) {
    console.log(`\n🔧 Processing: ${filePath}`);

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Add import if not exists
    if (!content.includes('generateCampaignSlug')) {
        content = content.replace(
            /import { generateSectorSlug } from '..\/..\/utils\/slugify';/,
            "import { generateSectorSlug, generateCampaignSlug } from '../../utils/slugify';"
        );
        console.log('  ✅ Added generateCampaignSlug import');
        modified = true;
    }

    // 2. Add slug regeneration after title assignment
    if (!content.includes('campaignData.slug = generateCampaignSlug(title)')) {
        content = content.replace(
            /(\s+campaignData\.title = title;)/,
            '$1\n                campaignData.slug = generateCampaignSlug(title); // Regenerate slug after title override'
        );
        console.log('  ✅ Added slug regeneration');
        modified = true;
    }

    // 3. Replace upsert with ID-based pattern
    const upsertRegex = /const { error } = await supabase\.from\('campaigns'\)\.upsert\(campaignData, { onConflict: 'reference_url' }\);[\s\S]*?console\.log\(`[^`]*Saved:[^`]*`\);[\s\S]*?}/;

    if (content.match(upsertRegex) && !content.includes('ID-BASED SLUG SYSTEM')) {
        content = content.replace(upsertRegex, ID_BASED_UPSERT_PATTERN + '\n            }');
        console.log('  ✅ Replaced upsert with ID-based pattern');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  💾 Saved: ${filePath}`);
        return true;
    } else {
        console.log('  ⏭️  Already updated or pattern not found');
        return false;
    }
}

let updatedCount = 0;
for (const scraper of scrapers) {
    if (updateScraper(scraper)) {
        updatedCount++;
    }
}

console.log(`\n\n✅ Updated ${updatedCount}/${scrapers.length} scrapers`);
console.log('\n⚠️  Note: İş Bankası scrapers (maximum, maximiles, etc.) may need manual review due to different patterns');
