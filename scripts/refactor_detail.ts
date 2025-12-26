import fs from 'fs';
import path from 'path';

const filePath = '/Users/hipoglisemi/Desktop/kartavantaj/src/components/CampaignDetail.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('👷 Refactoring CampaignDetail.tsx...');

// 1. Remove the old description paragraph
// We look for the exact string or close enough
const removeSearch = `<p className="text-gray-600 text-xs md:text-sm leading-relaxed">
                                    {data.description || \`\${data.bank} kartlarınızla yapacağınız alışverişlerde kaçırılmayacak fırsatlar sizi bekliyor.Kampanya detaylarını inceleyerek hemen katılın!\`}
                                </p>`;

if (content.includes(removeSearch)) {
    content = content.replace(removeSearch, `{/* Description moved to Accordion */}`);
    console.log('✅ Removed description from header.');
} else {
    // Try cleaner regex replace if exact match fails due to whitespace
    const regex = /<p className="text-gray-600 text-xs md:text-sm leading-relaxed">\s+\{data\.description \|\| .*?\}\s+<\/p>/s;
    if (regex.test(content)) {
        content = content.replace(regex, '{/* Description moved to Accordion */}');
        console.log('✅ Removed description from header (regex).');
    } else {
        console.warn('⚠️ Could not find description in header to remove.');
    }
}

// 2. Add description to Accordion
// Search for Accordion start
const accordionSearch = `<Accordion title="Kampanya Detayları ve Koşullar">
                        <div className="text-gray-600 space-y-6 text-sm leading-relaxed">`;

const newAccordionContent = `<Accordion title="Kampanya Detayları ve Koşullar">
                        <div className="text-gray-600 space-y-6 text-sm leading-relaxed">
                            {/* Description Section */}
                            <div className="prose prose-sm max-w-none prose-p:text-gray-600 prose-li:text-gray-600">
                                {data.description ? (
                                    (data.description.includes('<') && data.description.includes('>')) ? (
                                        <div dangerouslySetInnerHTML={{ __html: data.description }} />
                                    ) : (
                                        <p>{data.description}</p>
                                    )
                                ) : (
                                    <p>{data.bank} kartlarınızla yapacağınız alışverişlerde kaçırılmayacak fırsatlar sizi bekliyor.</p>
                                )}
                            </div>`;

if (content.includes(accordionSearch)) {
    content = content.replace(accordionSearch, newAccordionContent);
    console.log('✅ Added description to Accordion.');
} else {
    console.warn('⚠️ Could not find Accordion to add description.');
}

fs.writeFileSync(filePath, content);
