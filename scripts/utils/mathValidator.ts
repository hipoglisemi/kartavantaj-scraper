/**
 * Math Validator - Validates discount percentage calculations
 */

export interface MathValidationResult {
    isValid: boolean;
    calculatedPercentage?: number;
    error?: string;
    shouldCorrect: boolean;
}

/**
 * Extract numeric value from earning string
 * Examples: "100 TL Puan" -> 100, "500 TL İndirim" -> 500
 */
export function extractEarningAmount(earning: string | null | undefined): number | null {
    if (!earning) return null;

    const match = earning.match(/(\d+(?:[.,]\d+)?)/);
    if (!match) return null;

    return parseFloat(match[1].replace(',', '.'));
}

/**
 * Validate discount percentage calculation
 */
export function validateDiscountMath(campaign: any): MathValidationResult {
    const { min_spend, earning, discount_percentage } = campaign;

    // Skip if missing required fields
    if (!min_spend || !earning) {
        return {
            isValid: true, // Not invalid, just incomplete
            shouldCorrect: false
        };
    }

    const earningAmount = extractEarningAmount(earning);
    if (!earningAmount) {
        return {
            isValid: true,
            shouldCorrect: false,
            error: 'Could not extract earning amount'
        };
    }

    // Calculate expected percentage
    const calculatedPercentage = Math.round((earningAmount / min_spend) * 100 * 10) / 10; // Round to 1 decimal

    // If no discount_percentage exists, suggest it
    if (!discount_percentage) {
        return {
            isValid: false,
            calculatedPercentage,
            shouldCorrect: true,
            error: 'Missing discount_percentage'
        };
    }

    // Check if difference is significant (>2%)
    const difference = Math.abs(calculatedPercentage - discount_percentage);

    if (difference > 2) {
        return {
            isValid: false,
            calculatedPercentage,
            shouldCorrect: true,
            error: `Math error: ${discount_percentage}% should be ${calculatedPercentage}%`
        };
    }

    return {
        isValid: true,
        calculatedPercentage,
        shouldCorrect: false
    };
}

/**
 * Extract max discount from earning or discount fields
 */
export function extractMaxDiscount(campaign: any): number | null {
    const { earning, discount, max_discount } = campaign;

    if (max_discount) return max_discount;

    // Try to extract from earning
    const earningAmount = extractEarningAmount(earning);
    if (earningAmount) return earningAmount;

    // Try to extract from discount
    const discountAmount = extractEarningAmount(discount);
    if (discountAmount) return discountAmount;

    return null;
}
