// Bank Campaign Detector
// Detects bank-specific campaigns (avans, çekiliş, bağış, etc.) to skip AI processing

const BANK_CAMPAIGN_KEYWORDS = [
    // Avans & Nakit
    'avans', 'nakit avans', 'ek hesap', 'nakit çekim',

    // Çekiliş & Hediye
    'çekiliş', 'piyango', 'hediye çeki', 'hediye çekiliş',

    // Bağış
    'bağış', 'kampanya bağışı', 'yardım kampanyası',

    // Kart İşlemleri
    'kart başvuru', 'kart üyelik', 'yeni kart', 'kart başvurusu',
    'sanal kart', 'dijital kart',

    // Ödeme & Ekstre
    'ödeme talimatı', 'otomatik ödeme', 'fatura ödeme',
    'ekstre bölme', 'ekstre erteleme', 'taksit erteleme',
    'ödeme erteleme', 'taksit öteleme',

    // Puan Kampanyaları (sadece puan, alışveriş yok)
    'bonus puan kazan', 'chip-para kazan', 'worldpuan kazan',
    'axesspuan kazan', 'puan hediye',

    // Finansal Ürünler
    'faiz', 'komisyon', 'masraf', 'ücretsiz işlem',
    'kredi', 'kredi kartı limiti', 'limit artırım'
];

/**
 * Detects if a campaign is a bank-specific campaign (not merchant-based)
 * These campaigns should be classified as 'diger' without AI processing
 */
export function isBankCampaign(title: string, content: string): boolean {
    const text = (title + ' ' + content).toLowerCase();

    // 1. Keyword matching
    for (const keyword of BANK_CAMPAIGN_KEYWORDS) {
        if (text.includes(keyword.toLowerCase())) {
            return true;
        }
    }

    // 2. Pattern matching for pure point campaigns
    // Example: "500 TL Bonus" without any shopping requirement
    const pointPattern = /(\d+)\s*(tl|₺)\s*(bonus|chip|puan|worldpuan|axesspuan)/i;
    if (pointPattern.test(text)) {
        // Check if there's NO shopping/spending requirement
        const hasShoppingRequirement =
            text.includes('alışveriş') ||
            text.includes('harcama') ||
            text.includes('alışverişinizde') ||
            text.includes('harcamanızda');

        if (!hasShoppingRequirement) {
            return true; // Pure point campaign, no merchant
        }
    }

    // 3. Pattern for installment/payment campaigns
    const installmentPattern = /(\d+)\s*taksit/i;
    if (installmentPattern.test(text)) {
        // Check if it's a general installment offer (not merchant-specific)
        const hasMerchant =
            text.includes('mağaza') ||
            text.includes('market') ||
            text.includes('online') ||
            /[a-zçğıöşü]{4,}\s+(mağaza|market|online)/i.test(text);

        if (!hasMerchant) {
            return true; // General installment, not merchant-specific
        }
    }

    return false;
}

/**
 * Get the reason why a campaign was flagged as bank campaign (for logging)
 */
export function getBankCampaignReason(title: string, content: string): string {
    const text = (title + ' ' + content).toLowerCase();

    for (const keyword of BANK_CAMPAIGN_KEYWORDS) {
        if (text.includes(keyword.toLowerCase())) {
            return `Keyword: "${keyword}"`;
        }
    }

    if (/(\d+)\s*(tl|₺)\s*(bonus|chip|puan)/i.test(text)) {
        return 'Pure point campaign (no shopping requirement)';
    }

    if (/(\d+)\s*taksit/i.test(text)) {
        return 'General installment offer (no merchant)';
    }

    return 'Unknown';
}
