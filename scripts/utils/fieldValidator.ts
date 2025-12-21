/**
 * Field Validator - Detects missing critical fields
 */

export interface FieldValidationResult {
    missingFields: string[];
    isComplete: boolean;
    criticalMissing: string[];
}

const CRITICAL_FIELDS = [
    'title',
    'bank',
    'card_name',
    'category',
    'valid_until'
];

const IMPORTANT_FIELDS = [
    'description',
    'earning',
    'min_spend',
    'image',
    'eligible_customers'
];

/**
 * Check for missing fields
 */
export function validateFields(campaign: any): FieldValidationResult {
    const missingFields: string[] = [];
    const criticalMissing: string[] = [];

    // Check critical fields
    for (const field of CRITICAL_FIELDS) {
        if (!campaign[field] ||
            (Array.isArray(campaign[field]) && campaign[field].length === 0) ||
            campaign[field] === null ||
            campaign[field] === undefined ||
            campaign[field] === '') {
            missingFields.push(field);
            criticalMissing.push(field);
        }
    }

    // Check important fields
    for (const field of IMPORTANT_FIELDS) {
        if (!campaign[field] ||
            (Array.isArray(campaign[field]) && campaign[field].length === 0) ||
            campaign[field] === null ||
            campaign[field] === undefined ||
            campaign[field] === '') {
            missingFields.push(field);
        }
    }

    return {
        missingFields,
        criticalMissing,
        isComplete: missingFields.length === 0
    };
}

/**
 * Try to extract missing field from title or description
 * Now uses master_sectors table for dynamic category matching
 */
export function extractFromText(text: string, field: string, masterSectors?: string[]): string | null {
    if (!text) return null;

    const lowerText = text.toLowerCase();

    // Category extraction using master_sectors
    if (field === 'category') {
        // Build keyword map dynamically from master_sectors
        const categoryKeywords: Record<string, string> = {
            // Fallback keywords if master_sectors not provided
            'market': 'Market',
            'gıda': 'Market',
            'akaryakıt': 'Yakıt',
            'benzin': 'Yakıt',
            'yakıt': 'Yakıt',
            'shell': 'Yakıt',
            'opet': 'Yakıt',
            'giyim': 'Giyim & Moda',
            'moda': 'Giyim & Moda',
            'kıyafet': 'Giyim & Moda',
            'restoran': 'Restoran & Kafe',
            'kafe': 'Restoran & Kafe',
            'yemek': 'Restoran & Kafe',
            'seyahat': 'Seyahat',
            'tatil': 'Seyahat',
            'uçak': 'Seyahat',
            'otel': 'Seyahat',
            'thy': 'Seyahat',
            'elektronik': 'Elektronik',
            'teknoloji': 'Elektronik',
            'telefon': 'Elektronik',
            'bilgisayar': 'Elektronik',
            'online': 'Online Alışveriş',
            'e-ticaret': 'Online Alışveriş',
            'trendyol': 'Online Alışveriş',
            'hepsiburada': 'Online Alışveriş',
            'ev': 'Ev & Yaşam',
            'mobilya': 'Ev & Yaşam',
            'ikea': 'Ev & Yaşam',
            'sağlık': 'Sağlık & Güzellik',
            'kozmetik': 'Sağlık & Güzellik',
            'spor': 'Spor & Outdoor',
            'fitness': 'Spor & Outdoor',
            'kitap': 'Kitap & Kırtasiye',
            'kırtasiye': 'Kitap & Kırtasiye',
            'eğlence': 'Eğlence',
            'sinema': 'Eğlence',
            'konser': 'Eğlence'
        };

        // First try exact match with master_sectors if provided
        if (masterSectors) {
            for (const sector of masterSectors) {
                if (lowerText.includes(sector.toLowerCase())) {
                    return sector;
                }
            }
        }

        // Then try keyword matching
        for (const [keyword, category] of Object.entries(categoryKeywords)) {
            if (lowerText.includes(keyword)) {
                return category;
            }
        }
    }

    return null;
}

/**
 * Calculate quality score (0-100)
 */
export function calculateQualityScore(campaign: any): number {
    let score = 100;

    const validation = validateFields(campaign);

    // Deduct points for missing critical fields
    score -= validation.criticalMissing.length * 20;

    // Deduct points for missing important fields
    score -= (validation.missingFields.length - validation.criticalMissing.length) * 5;

    // Bonus for having rich data
    if (campaign.participation_points && campaign.participation_points.length > 0) score += 5;
    if (campaign.conditions && campaign.conditions.length > 0) score += 5;
    if (campaign.valid_locations && campaign.valid_locations.length > 0) score += 5;

    return Math.max(0, Math.min(100, score));
}
