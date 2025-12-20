/**
 * Main entry point
 * Runs all scrapers
 */

import { fetchAllCampaigns as fetchWorldCard, saveToSupabase } from './scrapers/worldcard';

async function main() {
    console.log('🚀 KartAvantaj Scraper Starting...\n');
    console.log('='.repeat(50) + '\n');

    try {
        // WorldCard
        console.log('📍 WORLDCARD\n');
        const worldCardCampaigns = await fetchWorldCard();
        if (worldCardCampaigns.length > 0) {
            await saveToSupabase(worldCardCampaigns);
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ All scrapers completed!\n');

    } catch (error) {
        console.error('\n💥 Scraper failed:', error);
        process.exit(1);
    }
}

main();
