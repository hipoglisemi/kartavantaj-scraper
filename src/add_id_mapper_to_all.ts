/**
 * Add ID Mapper to All Scrapers
 * Automatically adds the import and lookup call to all scraper files
 */

import * as fs from 'fs';
import * as path from 'path';

const SCRAPERS = [
    'src/scrapers/akbank/business.ts',
    'src/scrapers/akbank/free.ts',
    'src/scrapers/akbank/wings.ts',
    'src/scrapers/garanti/bonus.ts',
    'src/scrapers/halkbank/paraf.ts',
    'src/scrapers/isbankasi/maximum.ts',
    'src/scrapers/vakifbank/world.ts',
    'src/scrapers/yapikredi/adios.ts',
    'src/scrapers/yapikredi/crystal.ts',
    'src/scrapers/yapikredi/play.ts',
    'src/scrapers/yapikredi/world.ts',
    'src/scrapers/ziraat/bankkart.ts',
];

const IMPORT_LINE = "import { lookupIDs } from '../../utils/idMapper';";

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

function addIDMapperToScraper(scraperPath: string): boolean {
    const fullPath = path.join(__dirname, '..', scraperPath);

    if (!fs.existsSync(fullPath)) {
        console.log(`   ❌ File not found: ${scraperPath}`);
        return false;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');

    // Check if already has ID mapper
    if (content.includes('lookupIDs')) {
        console.log(`   ⏭️  Already has ID mapper`);
        return false;
    }

    let modified = false;

    // 1. Add import
    if (content.includes('campaignOptimizer')) {
        content = content.replace(
            /(import.*campaignOptimizer.*;\n)/,
            `$1${IMPORT_LINE}\n`
        );
        modified = true;
        console.log(`   ✅ Added import`);
    } else if (content.includes('bankMapper')) {
        content = content.replace(
            /(import.*bankMapper.*;\n)/,
            `$1${IMPORT_LINE}\n`
        );
        modified = true;
        console.log(`   ✅ Added import (after bankMapper)`);
    }

    // 2. Add ID lookup before upsert
    // Find the pattern: campaignData.min_spend = campaignData.min_spend || 0;
    // followed by supabase.from('campaigns').upsert
    const minSpendPattern = /(campaignData\.min_spend = campaignData\.min_spend \|\| 0;)\s*\n\s*(const { error } = await supabase)/;

    if (minSpendPattern.test(content)) {
        content = content.replace(
            minSpendPattern,
            `$1${LOOKUP_CODE}\n\n                $2`
        );
        modified = true;
        console.log(`   ✅ Added ID lookup`);
    } else {
        console.log(`   ⚠️  Could not find insertion point`);
    }

    if (modified) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        return true;
    }

    return false;
}

console.log('🔧 Adding ID Mapper to all scrapers...\n');

let successCount = 0;
let skipCount = 0;
let failCount = 0;

for (const scraper of SCRAPERS) {
    console.log(`📝 Processing: ${scraper}`);
    const result = addIDMapperToScraper(scraper);

    if (result) {
        successCount++;
    } else if (fs.readFileSync(path.join(__dirname, '..', scraper), 'utf-8').includes('lookupIDs')) {
        skipCount++;
    } else {
        failCount++;
    }

    console.log('');
}

console.log('═'.repeat(60));
console.log(`✅ Successfully updated: ${successCount}`);
console.log(`⏭️  Already had ID mapper: ${skipCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log('═'.repeat(60));
