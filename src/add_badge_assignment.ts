/**
 * Add Badge Assignment to All Scrapers
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

const IMPORT_LINE = "import { assignBadge } from '../../services/badgeAssigner';";

const BADGE_CODE = `
                // Assign badge based on campaign content
                const badge = assignBadge(campaignData);
                campaignData.badge_text = badge.text;
                campaignData.badge_color = badge.color;
`;

function addBadgeAssignment(scraperPath: string): boolean {
    const fullPath = path.join(__dirname, '..', scraperPath);

    if (!fs.existsSync(fullPath)) {
        console.log(`   ❌ File not found: ${scraperPath}`);
        return false;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');

    // Check if already has badge assignment
    if (content.includes('assignBadge')) {
        console.log(`   ⏭️  Already has badge assignment`);
        return false;
    }

    let modified = false;

    // 1. Add import after idMapper
    if (content.includes('idMapper')) {
        content = content.replace(
            /(import.*idMapper.*;\n)/,
            `$1${IMPORT_LINE}\n`
        );
        modified = true;
        console.log(`   ✅ Added import`);
    }

    // 2. Add badge assignment after ID lookup
    // Find: Object.assign(campaignData, ids);
    // Add badge code after it
    const idAssignPattern = /(Object\.assign\(campaignData, ids\);)\s*\n/;

    if (idAssignPattern.test(content)) {
        content = content.replace(
            idAssignPattern,
            `$1${BADGE_CODE}\n`
        );
        modified = true;
        console.log(`   ✅ Added badge assignment`);
    } else {
        console.log(`   ⚠️  Could not find ID assignment point`);
    }

    if (modified) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        return true;
    }

    return false;
}

console.log('🎨 Adding Badge Assignment to all scrapers...\n');

let successCount = 0;
let skipCount = 0;
let failCount = 0;

for (const scraper of SCRAPERS) {
    console.log(`📝 Processing: ${scraper}`);
    const result = addBadgeAssignment(scraper);

    if (result) {
        successCount++;
    } else if (fs.readFileSync(path.join(__dirname, '..', scraper), 'utf-8').includes('assignBadge')) {
        skipCount++;
    } else {
        failCount++;
    }

    console.log('');
}

console.log('═'.repeat(60));
console.log(`✅ Successfully updated: ${successCount}`);
console.log(`⏭️  Already had badge assignment: ${skipCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log('═'.repeat(60));
