
/**
 * Utility function to standardize and shorten benefit text for UI badges.
 * E.g., "Peşin fiyatına 6 aya varan taksit fırsatı" -> "6 Taksit"
 */
export function standardizeBenefit(text: string): string {
    if (!text || text.toLowerCase() === 'yok' || text.toLowerCase() === 'null') return text;

    let clean = text.trim();

    // 1. Standardize Taksit (extract max installment)
    if (clean.toLowerCase().includes('taksit')) {
        const match = clean.match(/(\d+)\s*(?:aya?\s*varan\s*)?taksit/i);
        if (match) {
            // Check for additional point benefit
            const pointMatch = clean.match(/(\d+[\d.,]*)\s*TL/i);
            return pointMatch
                ? `${pointMatch[1]} TL Puan + ${match[1]} Taksit`
                : `${match[1]} Taksit`;
        }
    }

    // 2. Standardize Puan / TL sums and remove fillers
    clean = clean
        .replace(/['’](?:ye|ya|e|a)(?=\s)/gi, '') // Remove suffixes like TL'ye -> TL
        .replace(/peşin fiyatına|vade farksız|ücretsiz|toplamda|varan|değerinde|hediye|fırsatı|imkanı|kazanma|özel|ayrıcalığı/gi, '')
        .replace(/worldpuan|bonus|chip-?para|maxipuan|bankkart lira|parafpara/gi, 'Puan')
        .replace(/\s+/g, ' ')
        .trim();

    // 3. Extract pure amounts if explicitly monetary
    if (clean.toLowerCase().includes('tl')) {
        const amounts = clean.match(/(\d+[\d.,]*)\s*TL/gi);
        if (amounts && amounts.length > 0) {
            // If multiple amounts, sum them
            const uniqueValues = new Set<number>();
            const sum = amounts.reduce((acc, curr) => {
                const val = parseFloat(curr.replace(/[^\d]/g, '').replace('.', '').replace(',', '.'));
                // Simple de-dupe logic (crudely avoids summing same value twice if stated redundantly)
                if (!uniqueValues.has(val)) {
                    uniqueValues.add(val);
                    return acc + val;
                }
                return acc; // Don't add duplicates
            }, 0);

            // If sum is substantial and text is long, return just the sum
            if (sum > 0 && clean.length > 20) return `${sum.toLocaleString('tr-TR')} TL Puan`;
        }
    }

    // 4. Percentage simplifications
    if (clean.includes('%')) {
        const pctMatch = clean.match(/(%\s*\d+|\d+\s*%)/);
        if (pctMatch) {
            // Keep existing label if it explicitly says Indirim/Discount
            if (clean.toLowerCase().includes('indirim')) return `${pctMatch[1].replace(/\s/g, '')} İndirim`;
            // Default to Puan ONLY if it says Puan/Chip/Bonus/Worldpuan etc. or if ambiguous but NOT discount
            if (clean.match(/puan|chip|bonus|world|maxi|paraf/i)) return `${pctMatch[1].replace(/\s/g, '')} Puan`;

            // If completely ambiguous (just "%10"), rely on field name context (earning vs discount) or default to Puan as last resort?
            // Better to leave it ambiguous or assume Puan for now but allow "İndirim" passed from AI to survive step 2.

            // To ensure "İndirim" survives if it was stripped in step 2:
            // Step 2 removed "İmkanı", "Fırsatı" etc but NOT "İndirim" (wait, check step 2)
            // Original Step 2 removed: peşin fiyatına, vade farksız, ücretsiz, toplamda, varan, değerinde, hediye, fırsatı, imkanı, kazanma, özel, ayrıcalığı
            // "İndirim" was NOT removed in step 2.

            return `${pctMatch[1].replace(/\s/g, '')} Puan`;
        }
    }

    // 5. Final max length truncation
    if (clean.length > 25) {
        clean = clean.substring(0, 22) + '...';
    }

    return clean;
}

/**
 * Ensures earning and discount fields are synchronized and standardized.
 */
export function syncEarningAndDiscount(data: any): any {
    if (!data) return data;

    let earning = data.earning || '';
    let discount = data.discount || '';

    // Standardize both
    earning = standardizeBenefit(earning);
    discount = standardizeBenefit(discount);

    const lowerEarning = earning.toLowerCase().trim();
    const lowerDiscount = discount.toLowerCase().trim();

    // Sync logic
    if (lowerDiscount && lowerDiscount !== 'yok' && lowerDiscount !== '') {
        if (!lowerEarning || lowerEarning === '0 tl puan' || lowerEarning === 'yok' || lowerEarning === 'null') {
            earning = discount;
        }
    } else if (lowerEarning && lowerEarning !== 'yok' && lowerEarning !== '' && (!lowerDiscount || lowerDiscount === 'yok')) {
        discount = earning;
    }

    data.earning = earning;
    data.discount = discount;

    syncBrands(data);

    return data;
}

/**
 * Deduplicates and standardizes brands based on comma distribution.
 */
export function syncBrands(data: any): any {
    if (!data || !data.brand) return data;

    let brandsStr = data.brand;
    if (typeof brandsStr !== 'string') return data;

    // Split, clean, deduplicate
    const brandList = brandsStr
        .split(',')
        .map((b: string) => b.trim())
        .filter((b: string) => b && b.toLowerCase() !== 'yok' && b.toLowerCase() !== 'null');

    const uniqueBrands = [...new Set(brandList)];
    data.brand = uniqueBrands.join(', ');

    return data;
}
