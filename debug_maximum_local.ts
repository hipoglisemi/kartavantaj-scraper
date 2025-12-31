
import * as fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('maximum_category_dump.html', 'utf8');
const $ = cheerio.load(html);

console.log('--- TESTING SELECTORS ON LOCAL DUMP ---');

const cards = $('.card');
console.log(`Found ${cards.length} cards.`);

cards.each((index, element) => {
    if (index > 5) return;

    const card = $(element);

    // Exact logic from maximum.ts:
    // const titleEl = card.querySelector('.card-text, h3, .card-title, h5, h4, .title') || card.querySelector('div[class*="title" i]');

    let titleEl = card.find('.card-text, h3, .card-title, h5, h4, .title').first();
    if (titleEl.length === 0) {
        titleEl = card.find('div[class*="title" i]').first();
    }

    const rawTitle = titleEl.length > 0 ? titleEl.text().trim() : 'NULL';

    // Fallback logic
    const fallback = card.text().trim().split('\n')[0].trim();

    console.log(`\nCard ${index + 1}:`);
    console.log(`  Selector Found: "${rawTitle}"`);
    console.log(`  Tag Name: ${titleEl.length > 0 ? titleEl.prop('tagName') : 'NONE'}`);
    console.log(`  Fallback would be: "${fallback}"`);
});
