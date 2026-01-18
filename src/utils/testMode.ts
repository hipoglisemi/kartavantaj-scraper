/**
 * Test Mode Utility for Scrapers
 * 
 * Bu utility scraper'ların test modunda çalışmasını sağlar.
 * TEST_MODE=true olduğunda veriler test_campaigns tablosuna yazılır.
 * 
 * Kullanım:
 * ```typescript
 * import { getTargetTable, isTestMode } from './testMode';
 * 
 * const tableName = getTargetTable(); // 'test_campaigns' veya 'campaigns'
 * await supabase.from(tableName).insert(data);
 * ```
 */

/**
 * Test modunda mıyız?
 */
export function isTestMode(): boolean {
    return process.env.TEST_MODE === 'true' || process.argv.includes('--test');
}

/**
 * Hedef tablo adını döndürür
 * Test modunda: 'test_campaigns'
 * Normal modda: 'campaigns'
 */
export function getTargetTable(): string {
    return isTestMode() ? 'test_campaigns' : 'campaigns';
}

/**
 * Test modu log prefix
 */
export function getLogPrefix(): string {
    return isTestMode() ? '🧪 [TEST MODE]' : '🚀';
}

/**
 * Test modu başlangıç mesajı
 */
export function logTestModeStatus(): void {
    if (isTestMode()) {
        console.log('\n' + '='.repeat(70));
        console.log('🧪 TEST MODE ACTIVE');
        console.log('📊 Target Table: test_campaigns');
        console.log('⚠️  Data will NOT be written to production campaigns table');
        console.log('='.repeat(70) + '\n');
    }
}

/**
 * Test modu özet raporu
 */
export function logTestModeSummary(count: number, tableName: string): void {
    if (isTestMode()) {
        console.log('\n' + '='.repeat(70));
        console.log('🧪 TEST MODE SUMMARY');
        console.log(`✅ Processed ${count} campaigns`);
        console.log(`📊 Written to: ${tableName}`);
        console.log(`🔍 View results in Admin Panel > Test Scraper`);
        console.log('='.repeat(70) + '\n');
    }
}
