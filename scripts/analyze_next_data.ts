import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('turkcell_next_data.json', 'utf-8'));

function findKey(obj: any, key: string): any {
    if (!obj) return null;
    if (obj[key]) return obj[key];
    for (const k in obj) {
        if (typeof obj[k] === 'object') {
            const found = findKey(obj[k], key);
            if (found) return found;
        }
    }
    return null;
}

// Inspect pageProps
const props = data.props?.pageProps;
console.log('Page Props Keys:', Object.keys(props || {}));

// Try to find campaign data
// Usually it's in 'campaign' or similar
console.log('Searching for "Sinema" in JSON tree...');

// Helper to search recursively for unique strings
let foundImage = '';
let foundContent = '';

function traverse(o: any) {
    if (!o || typeof o !== 'object') return;

    // Check if this object is the "Campaign" object
    if (o.title && typeof o.title === 'string' && o.title.includes('Sinema')) {
        console.log('✅ FOUND CAMPAIGN OBJECT:', JSON.stringify(o, null, 2));
        return; // Found it
    }

    // Also look inside queries if it's react-query state
    if (o.state && o.state.data) {
        // traverse(o.state.data); 
    }

    for (const k in o) {
        if (typeof o[k] === 'object' && o[k] !== null) {
            traverse(o[k]);
        }
    }
}
traverse(props);
