/**
 * Add Generic Brand Detection to All Scrapers
 */

import * as fs from 'fs';
import * as path from 'path';

const SCRAPERS = [
    'src/scrapers/akbank/axess.ts',
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

const IMPORT_LINE = "import { markGenericBrand } from '../../utils/genericDetector';";

const GENERIC_CODE = `
                // Mark as generic if it's a non-brand-specific campaign
                markGenericBrand(campaignData);
`;

function addGenericDetection(scraperPath: string): boolean {
    const fullPath = path.join(__dirname, '..', scraperPath);

    if (!fs.existsSync(fullPath)) {
        console.log(`   ❌ File not found: ${scraperPath}`);
        return false;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');

    // Check if already has generic detection
    if (content.includes('markGenericBrand') || content.includes('genericDetector')) {
        console.log(`   ⏭️  Already has generic detection`);
        return false;
    }

    let modified = false;

    // 1. Add import after badgeAssigner
    if (content.includes('badgeAssigner')) {
        content = content.replace(
            /(import.*badgeAssigner.*;\n)/,
            `$1${IMPORT_LINE}\n`
        );
        modified = true;
        console.log(`   ✅ Added import`);
    }

    // 2. Add generic detection after badge assignment
    // Find: campaignData.badge_color = badge.color;
    // Add generic code after it
    const badgeColorPattern = /(campaignData\.badge_color = badge\.color;)\s*\n/;

    if (badgeColorPattern.test(content)) {
        content = content.replace(
            badgeColorPattern,
            `$1${GENERIC_CODE}\n`
        );
        modified = true;
        console.log(`   ✅ Added generic detection`);
    } else {
        console.log(`   ⚠️  Could not find badge assignment point`);
    }

    if (modified) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        return true;
    }

    return false;
}

console.log('🏷️  Adding Generic Brand Detection to all scrapers...\n');

let successCount = 0;
let skipCount = 0;
let failCount = 0;

for (const scraper of SCRAPERS) {
    console.log(`📝 Processing: ${scraper}`);
    const result = addGenericDetection(scraper);

    if (result) {
        successCount++;
    } else if (fs.readFileSync(path.join(__dirname, '..', scraper), 'utf-8').includes('markGenericBrand')) {
        skipCount++;
    } else {
        failCount++;
    }

    console.log('');
}

console.log('═'.repeat(60));
console.log(`✅ Successfully updated: ${successCount}`);
console.log(`⏭️  Already had generic detection: ${skipCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log('═'.repeat(60));
