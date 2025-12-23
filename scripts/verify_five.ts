import { execSync } from 'child_process';
import * as path from 'path';

const scrapers = [
    { name: 'Paraf', path: 'src/scrapers/halkbank/paraf.ts' },
    { name: 'Axess', path: 'src/scrapers/akbank/axess.ts' },
    { name: 'Free', path: 'src/scrapers/akbank/free.ts' },
    { name: 'Wings', path: 'src/scrapers/akbank/wings.ts' },
    { name: 'Business', path: 'src/scrapers/akbank/business.ts' }
];

async function main() {
    console.log('🧪 Starting Verification for first 5 campaigns...\n');

    for (const scraper of scrapers) {
        console.log(`\n============== RUNNING ${scraper.name.toUpperCase()} ==============`);
        try {
            // Run with --ai and --limit=5
            const cmd = `npx tsx ${scraper.path} --ai --limit=5`;
            console.log(`Running: ${cmd}`);
            execSync(cmd, { stdio: 'inherit' });
            console.log(`✅ ${scraper.name} completed successfully.`);
        } catch (error: any) {
            console.error(`❌ ${scraper.name} failed!`);
            // We don't exit to allow others to run, but we mark failure
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Verification script finished!');
}

main().catch(console.error);
