
/**
 * Utility function to ensure earning and discount fields are synchronized.
 * If discount has a value but earning is placeholder/empty, it copies discount to earning.
 */
export function syncEarningAndDiscount(data: any): any {
    if (!data) return data;

    const currentEarning = (data.earning || '').toLowerCase().trim();
    const currentDiscount = (data.discount || '').toLowerCase().trim();

    // If discount is specified but earning is empty/"0 TL Puan"/"Yok", sync them.
    if (currentDiscount && currentDiscount !== 'yok' && currentDiscount !== '') {
        if (!currentEarning ||
            currentEarning === '0 tl puan' ||
            currentEarning === 'yok' ||
            currentEarning === 'null') {
            data.earning = data.discount;
        }
    }

    return data;
}
