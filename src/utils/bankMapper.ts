/**
 * Centralized bank name mapping
 * Maps internal scraper names to official display names
 */

export const BANK_NAME_MAP: Record<string, string> = {
    // Garanti
    'Garanti': 'Garanti BBVA',
    'Garanti BBVA': 'Garanti BBVA',

    // Akbank
    'Akbank': 'Akbank',

    // İş Bankası
    'İş Bankası': 'İş Bankası',
    'Is Bankasi': 'İş Bankası',

    // Yapı Kredi
    'Yapı Kredi': 'Yapı Kredi',
    'Yapi Kredi': 'Yapı Kredi',

    // Ziraat
    'Ziraat': 'Ziraat Bankası',
    'Ziraat Bankası': 'Ziraat Bankası',
    'Ziraat Bankasi': 'Ziraat Bankası',

    // Halkbank
    'Halkbank': 'Halkbank',

    // Vakıfbank - CRITICAL: Support both Turkish and English 'i'
    'Vakıfbank': 'Vakıfbank',
    'Vakifbank': 'Vakıfbank',  // Fallback for English 'i'
};

/**
 * Normalize bank name to official display name
 */
export function normalizeBankName(bankName: string): string {
    if (!bankName) return '';

    // Try exact match first
    if (BANK_NAME_MAP[bankName]) {
        return BANK_NAME_MAP[bankName];
    }

    // Try case-insensitive match
    const normalized = Object.keys(BANK_NAME_MAP).find(
        key => key.toLowerCase() === bankName.toLowerCase()
    );

    return normalized ? BANK_NAME_MAP[normalized] : bankName;
}

/**
 * Get all official bank names
 */
export function getOfficialBankNames(): string[] {
    return [...new Set(Object.values(BANK_NAME_MAP))];
}
