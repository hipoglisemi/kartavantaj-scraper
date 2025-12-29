/**
 * Fix remaining scrapers manually
 */

import * as fs from 'fs';
import * as path from 'path';

const SCRAPERS_TO_FIX = [
    'src/scrapers/isbankasi/maximum.ts',
    'src/scrapers/yapikredi/adios.ts',
    'src/scrapers/yapikredi/crystal.ts',
    'src/scrapers/yapikredi/play.ts',
    'src/scrapers/yapikredi/world.ts',
];

const LOOKUP_CODE = `
                // Lookup and assign IDs from master tables
                const ids = await lookupIDs(
                    campaignData.bank,
                    campaignData.card_name,
                    campaignData.brand,
                    campaignData.sector_slug
                );
                Object.assign(campaignData, ids);
`;

for (const scraperPath of SCRAPERS_TO_FIX) {
    const fullPath = path.join(__dirname, '..', scraperPath);
    let content = fs.readFileSync(fullPath, 'utf-8');

    // Try different patterns
    const patterns = [
        // Pattern 1: min_spend followed by const { error }
        /(campaignData\.min_spend = campaignData\.min_spend \|\| 0;)\s*\n\s*(const { error } = await supabase)/,
        // Pattern 2: min_spend followed by // Upsert or similar comment
        /(campaignData\.min_spend = campaignData\.min_spend \|\| 0;)\s*\n\s*(\/\/ Upsert|\/\/ Save)/,
        // Pattern 3: min_spend followed by await supabase
        /(campaignData\.min_spend = campaignData\.min_spend \|\| 0;)\s*\n\s*(await supabase)/,
        // Pattern 4: Just before .from('campaigns').upsert
        /(campaignData\.min_spend = campaignData\.min_spend \|\| 0;)\s*\n\s*(.from\('campaigns'\)\.upsert)/,
    ];

    let found = false;
    for (const pattern of patterns) {
        if (pattern.test(content)) {
            content = content.replace(pattern, `$1${LOOKUP_CODE}\n\n                $2`);
            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`✅ Fixed: ${scraperPath}`);
            found = true;
            break;
        }
    }

    if (!found) {
        console.log(`⚠️  Could not fix: ${scraperPath} - needs manual intervention`);
    }
}

console.log('\n✅ Done!');
