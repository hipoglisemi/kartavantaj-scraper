#!/usr/bin/env node

/**
 * Bulk update script for İş Bankası scrapers
 */

const fs = require('fs');

const scrapers = [
    'src/scrapers/isbankasi/maximum.ts',
    'src/scrapers/isbankasi/maximiles.ts',
    'src/scrapers/isbankasi/maximum-v3.ts',
    'src/scrapers/isbankasi/maximum-v4.ts',
    'src/scrapers/isbankasi/maximum-import.ts',
    'src/scrapers/chippin/chippin.ts',
];

const ID_BASED_UPSERT_PATTERN = `
            // ID-BASED SLUG SYSTEM
            const { data: existing } = await supabase
                .from('campaigns')
                .select('id')
                .eq('reference_url', url)
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

    // 1. Add import
    if (!content.includes('generateCampaignSlug')) {
        content = content.replace(
            /import { generateSectorSlug } from '..\/..\/utils\/slugify';/,
            "import { generateSectorSlug, generateCampaignSlug } from '../../utils/slugify';"
        );
        console.log('  ✅ Added generateCampaignSlug import');
        modified = true;
    }

    // 2. Add slug regeneration (handle different patterns)
    if (!content.includes('campaignData.slug = generateCampaignSlug')) {
        // Pattern 1: campaignData.title = title;
        content = content.replace(
            /([ \t]+)campaignData\.title = title;/g,
            '$1campaignData.title = title;\n$1campaignData.slug = generateCampaignSlug(title); // Regenerate slug'
        );

        // Pattern 2: campaignData.title = pythonData.title;
        content = content.replace(
            /([ \t]+)campaignData\.title = pythonData\.title;/g,
            '$1campaignData.title = pythonData.title;\n$1campaignData.slug = generateCampaignSlug(pythonData.title); // Regenerate slug'
        );

        console.log('  ✅ Added slug regeneration');
        modified = true;
    }

    // 3. Replace upsert
    const upsertRegex = /const { error } = await supabase\s*\.from\('campaigns'\)\s*\.upsert\(campaignData, { onConflict: 'reference_url' }\);[\s\S]*?console\.log\(`[^`]*Saved[^`]*`\);/;

    if (content.match(upsertRegex) && !content.includes('ID-BASED SLUG SYSTEM')) {
        content = content.replace(upsertRegex, ID_BASED_UPSERT_PATTERN);
        console.log('  ✅ Replaced upsert with ID-based pattern');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  💾 Saved: ${filePath}`);
        return true;
    } else {
        console.log('  ⏭️  Already updated');
        return false;
    }
}

let updatedCount = 0;
for (const scraper of scrapers) {
    if (updateScraper(scraper)) {
        updatedCount++;
    }
}

console.log(`\n\n✅ Updated ${updatedCount}/${scrapers.length} İş Bankası scrapers`);
