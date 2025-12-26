import fs from 'fs';

const filePath = '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/utils/dataExtractor.ts';
let content = fs.readFileSync(filePath, 'utf8');

const functionCode = `

/**
 * Main extractor function
 */
export async function extractDirectly(
    html: string,
    title: string,
    masterBrands: string[] = []
): Promise<ExtractedData> {
    const $ = cheerio.load(html);

    // Target common content area selectors to avoid noise
    const contentSelectors = ['.cmsContent', '.campaingDetail', 'main', 'article'];
    let targetHtml = '';
    for (const sel of contentSelectors) {
        const found = $(sel);
        if (found.length > 0) {
            targetHtml = found.html() || '';
            break;
        }
    }
    if (!targetHtml) targetHtml = $.html();

    const $$ = cheerio.load(targetHtml);
    $$('script, style, iframe, nav, footer, header, .footer, .header, .sidebar, #header, #footer').remove();

    // Attempt to isolate just the "description" part if possible
    const possibleCleanSelectors = ['.campaign-text', '.content-body', '.description', 'h2, p, li'];
    let cleanTextMatches: string[] = [];
    $$(possibleCleanSelectors.join(',')).each((_, el) => {
        cleanTextMatches.push($$(el).text());
    });

    const cleanText = cleanTextMatches.join(' ').replace(/\s+/g, ' ').trim() || $$.text().replace(/\s+/g, ' ').trim();
    
    // Use cleaned HTML for description if available, otherwise plain text.
    const descriptionHtml = $$.html().trim(); 

    const dates = extractDates(cleanText);
    const min_spend = extractMinSpend(cleanText);
    const earning = extractEarning(title, cleanText);
    const discount = extractDiscount(title, cleanText);

    const localBrands = [...masterBrands];
    if (!localBrands.map(b => b.toLowerCase()).includes('vatan bilgisayar')) localBrands.push('Vatan Bilgisayar');
    if (!localBrands.map(b => b.toLowerCase()).includes('teknosa')) localBrands.push('Teknosa');

    const classification = extractClassification(title, cleanText, localBrands);

    return {
        valid_from: dates.from,
        valid_until: dates.until,
        min_spend,
        earning,
        discount,
        brand: classification.brand,
        sector_slug: classification.sector_slug,
        category: classification.category,
        description: descriptionHtml || cleanText
    };
}
`;

// Append the missing function
fs.appendFileSync(filePath, functionCode);
console.log('✅ Appended extractDirectly function to dataExtractor.ts');
