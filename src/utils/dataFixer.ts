
/**
 * Utility function to standardize and shorten benefit text for UI badges.
 * E.g., "Peşin fiyatına 6 aya varan taksit fırsatı" -> "6 Taksit"
 */
export function standardizeBenefit(text: string): string {
    if (!text || text.toLowerCase() === 'yok' || text.toLowerCase() === 'null') return text;

    let clean = text.trim();

    // 1. Standardize Taksit
    if (clean.toLowerCase().includes('taksit')) {
        const match = clean.match(/(\d+)\s*aya?\s*varan\s*taksit/i) || clean.match(/(\d+)\s*taksit/i);
        if (match) return `${match[1]} Taksit`;
    }

    // 2. Standardize Puan / TL sum
    if (clean.includes('+') && clean.toLowerCase().includes('tl')) {
        const amounts = clean.match(/(\d+[\d.,]*)\s*TL/gi);
        if (amounts && amounts.length > 1) {
            // If "Toplam" is mentioned, it likely already includes the sum.
            if (clean.toLowerCase().includes('toplam')) {
                const totalMatch = clean.match(/toplam\s*(\d+[\d.,]*)\s*TL/i);
                if (totalMatch) return `${totalMatch[1]} TL Puan`;
            }

            const uniqueValues = new Set<number>();
            const sum = amounts.reduce((acc, curr) => {
                const val = parseFloat(curr.replace(/[^\d]/g, '').replace('.', '').replace(',', '.'));
                if (!uniqueValues.has(val)) {
                    uniqueValues.add(val);
                    return acc + val;
                }
                return acc;
            }, 0);
            if (sum > 0) return `${sum.toLocaleString('tr-TR')} TL Puan`;
        }
    }

    // 3. Trim and summarize if too long (Max ~25 chars)
    if (clean.length > 25) {
        // Percentage mapping
        if (clean.includes('%')) {
            const pctMatch = clean.match(/(%\d+|\d+%)/);
            if (pctMatch) {
                if (clean.toLowerCase().includes('puan')) return `${pctMatch[1]} Puan`;
                if (clean.toLowerCase().includes('indirim')) return `${pctMatch[1]} İndirim`;
                return `${pctMatch[1]} Avantaj`;
            }
        }

        // Remove common fillers
        clean = clean
            .replace(/İmkanı|Fırsatı|Hediye|Kazanma|Kadar|Toplamda|Veren|Özel/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Final truncation if still too long
        if (clean.length > 30) {
            clean = clean.substring(0, 27) + '...';
        }
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

    return data;
}
