/**
 * Date Validator - Validates campaign date logic
 */

export interface DateValidationResult {
    isValid: boolean;
    error?: string;
    shouldDeactivate?: boolean;
    correctedDates?: {
        valid_from?: string;
        valid_until?: string;
    };
}

/**
 * Validate campaign dates
 */
export function validateDates(campaign: any): DateValidationResult {
    const { valid_from, valid_until, is_active } = campaign;

    // Skip if dates are missing
    if (!valid_from || !valid_until) {
        return {
            isValid: true, // Not invalid, just incomplete
            error: 'Missing date fields'
        };
    }

    const fromDate = new Date(valid_from);
    const untilDate = new Date(valid_until);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate comparison

    // Check if valid_from is after valid_until (logic error)
    if (fromDate > untilDate) {
        return {
            isValid: false,
            error: 'valid_from is after valid_until',
            correctedDates: {
                valid_from: valid_until, // Swap them
                valid_until: valid_from
            }
        };
    }

    // Check if campaign is expired but still active
    if (untilDate < today && is_active) {
        return {
            isValid: false,
            error: 'Campaign expired but still active',
            shouldDeactivate: true
        };
    }

    return {
        isValid: true
    };
}

/**
 * Parse Turkish date formats
 * Examples: "31 Aralık 2025", "2025-12-31"
 */
export function parseTurkishDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
        return isoDate;
    }

    // Turkish month names
    const months: Record<string, number> = {
        'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3,
        'mayıs': 4, 'haziran': 5, 'temmuz': 6, 'ağustos': 7,
        'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11
    };

    // Match "31 Aralık 2025" format
    const match = dateStr.match(/(\d+)\s+(\w+)\s+(\d{4})/i);
    if (match) {
        const day = parseInt(match[1]);
        const monthName = match[2].toLowerCase();
        const year = parseInt(match[3]);

        const month = months[monthName];
        if (month !== undefined) {
            return new Date(year, month, day);
        }
    }

    return null;
}
