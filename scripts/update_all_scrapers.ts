/**
 * Automated script to update all scrapers with normalizeBankName
 * Finds all scraper files and adds the bank mapper import + usage
 */

import * as fs from 'fs';
import * as path from 'path';

const SCRAPERS_DIR = path.join(__dirname, '../src/scrapers');

const BANK_MAPPING = {
    'ziraat/bankkart.ts': 'Ziraat Bankası',
    'halkbank/paraf.ts': 'Halkbank',
    'vakifbank/world.ts': 'Vakıfbank', // Already done
    'garanti/bonus.ts': 'Garanti BBVA',
    'akbank/axess.ts': 'Akbank',
    'akbank/wings.ts': 'Akbank',
    'akbank/free.ts': 'Akbank',
    'yapikredi/world.ts': 'Yapı Kredi',
    'yapikredi/adios.ts': 'Yapı Kredi',
    'yapikredi/play.ts': 'Yapı Kredi',
    'yapikredi/crystal.ts': 'Yapı Kredi',
    'isbankasi/maximum.ts': 'İş Bankası',
};

function updateScraperFile(filePath: string, bankName: string): boolean {
    const fullPath = path.join(SCRAPERS_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    // Check if already has import
    if (content.includes('normalizeBankName')) {
        console.log(`✅ ${filePath} - Already updated`);
        return false;
    }

    // Add import after other imports
    const importLine = "import { normalizeBankName } from '../../utils/bankMapper';";

    // Find the last import line
    const lines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') && !lines[i].includes('normalizeBankName')) {
            lastImportIndex = i;
        }
    }

    if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, importLine);
        content = lines.join('\n');
    }

    // Replace hardcoded bank assignments
    const patterns = [
        new RegExp(`campaignData\\.bank = '${bankName}';`, 'g'),
        new RegExp(`campaignData\\.bank = "${bankName}";`, 'g'),
        new RegExp(`bank: '${bankName}'`, 'g'),
        new RegExp(`bank: "${bankName}"`, 'g'),
    ];

    let replaced = false;
    for (const pattern of patterns) {
        if (pattern.test(content)) {
            content = content.replace(pattern, (match) => {
                replaced = true;
                if (match.includes('campaignData.bank =')) {
                    return `campaignData.bank = await normalizeBankName('${bankName}');`;
                } else {
                    return `bank: await normalizeBankName('${bankName}')`;
                }
            });
        }
    }

    if (replaced) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`🔄 ${filePath} - Updated`);
        return true;
    } else {
        console.log(`⚠️  ${filePath} - No bank assignment found`);
        return false;
    }
}

console.log('🚀 Updating all scrapers with normalizeBankName...\n');

let updated = 0;
let skipped = 0;
let notFound = 0;

for (const [file, bank] of Object.entries(BANK_MAPPING)) {
    const result = updateScraperFile(file, bank);
    if (result) updated++;
    else if (fs.existsSync(path.join(SCRAPERS_DIR, file))) skipped++;
    else notFound++;
}

console.log(`\n📊 Summary:`);
console.log(`   ✅ Updated: ${updated}`);
console.log(`   ⏭️  Skipped (already done): ${skipped}`);
console.log(`   ❌ Not found: ${notFound}`);

if (updated > 0) {
    console.log('\n✅ All scrapers updated! Please review the changes.');
} else {
    console.log('\n✅ All scrapers already use normalizeBankName!');
}
