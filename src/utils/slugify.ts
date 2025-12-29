/**
 * Türkçe karakterleri İngilizce karşılıklarına çevirir
 */
function turkishToEnglish(text: string): string {
    const charMap: Record<string, string> = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U'
    };

    return text.split('').map(char => charMap[char] || char).join('');
}

/**
 * Sektör slug'ı oluşturur (category → sector_slug)
 */
export function generateSectorSlug(category: string): string {
    if (!category) return 'diger';

    return turkishToEnglish(category)
        .toLowerCase()
        .replace(/&/g, 've')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

/**
 * Kampanya slug'ı oluşturur (title → slug)
 * Format: "baslik-kelimeler-ID"
 */
export function generateCampaignSlug(title: string, id?: number): string {
    if (!title) return id ? `kampanya-${id}` : 'kampanya';

    // Türkçe karakterleri çevir
    let slug = turkishToEnglish(title);

    // Temizle ve formatla
    slug = slug
        .toLowerCase()
        .replace(/&/g, 've')
        .replace(/[^a-z0-9\s-]/g, '') // Sadece harf, rakam, boşluk ve tire
        .replace(/\s+/g, '-')         // Boşlukları tire yap
        .replace(/-+/g, '-')          // Çift tireleri tek tire yap
        .trim()
        .replace(/^-+|-+$/g, '');     // Baş ve sondaki tireleri kaldır

    // Çok uzunsa kısalt (max 60 karakter)
    if (slug.length > 60) {
        slug = slug.substring(0, 60).replace(/-[^-]*$/, '');
    }

    // ID varsa sona ekle
    return id ? `${slug}-${id}` : slug;
}

/**
 * Slug'dan ID çıkarır
 */
export function extractIdFromSlug(slug: string): number | null {
    const match = slug.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
}
