const fs = require('fs');
const content = fs.readFileSync('maximum_category_dump.html', 'utf-8');

// Regex to find cards and their content
// Looking for <div class="card ..."> ... <img ...> ... <div class="card-body">
const cardRegex = /<div class="card[^>]*>([\s\S]*?)<div class="card-body"/g;
let match;
let count = 0;

console.log('--- ANALYZING CARDS IN DUMP ---');

while ((match = cardRegex.exec(content)) !== null) {
    const cardContent = match[1];
    // Find img tag inside card
    const imgMatch = /<img[^>]+src="([^"]+)"/g.exec(cardContent);
    const dataSrcMatch = /<img[^>]+data-src="([^"]+)"/g.exec(cardContent);

    if (imgMatch || dataSrcMatch) {
        console.log(`Card ${count++}:`);
        if (imgMatch) console.log(`  src: ${imgMatch[1]}`);
        if (dataSrcMatch) console.log(`  data-src: ${dataSrcMatch[1]}`);
    }
}
