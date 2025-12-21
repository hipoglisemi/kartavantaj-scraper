// Utility function to generate sector_slug from category name
export function generateSectorSlug(category: string): string {
    if (!category) return 'diger';

    return category
        .toLowerCase()
        .replace(/\s*&\s*/g, '-')  // "Market & Gıda" -> "market-gida"
        .replace(/\s+/g, '-')       // Spaces to dashes
        .replace(/ı/g, 'i')         // Turkish i
        .replace(/ğ/g, 'g')         // Turkish g
        .replace(/ü/g, 'u')         // Turkish u
        .replace(/ş/g, 's')         // Turkish s
        .replace(/ö/g, 'o')         // Turkish o
        .replace(/ç/g, 'c')         // Turkish c
        .replace(/[^a-z0-9-]/g, '') // Remove special chars
        .replace(/-+/g, '-')        // Multiple dashes to single
        .replace(/^-|-$/g, '');     // Trim dashes
}
