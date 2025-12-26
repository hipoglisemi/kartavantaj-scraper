import fs from 'fs';

const filePath = '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/utils/dataExtractor.ts';
let content = fs.readFileSync(filePath, 'utf8');

// The file has a duplicated export async function extractDirectly block at the end because replace_file_content failed to match exactly or appended.
// We need to keep the LAST one (which is the updated one) and remove the first one, OR remove the duplicate at the end if the first one was updated.
// Let's inspect the file content structure via logic:
// If there are two "export async function extractDirectly", we need to remove one.

if ((content.match(/export async function extractDirectly/g) || []).length > 1) {
    console.log('🗑️ Fixing duplicate function implementation...');

    // Split by the function signature
    const parts = content.split('export async function extractDirectly');

    // We expect 3 parts: [prefix, body1, body2] (since signature appears twice)
    // Actually split separates them.
    // Let's simply rewrite the file using the known good structure.
    // The safest bet without complex parsing is to read the file, find the first occurrence, and if a second exists, delete from the second occurrence to the end (or specific block).

    // But wait, the REPLACE tool might have just inserted the new one at the top or bottom.
    // Let's use a regex to identify the OLD function (which didn't have 'description' in return) vs NEW one.

    // Old return:
    // return {
    //    valid_from: dates.from,
    //    ...
    //    category: classification.category
    // };

    // New return:
    //    category: classification.category,
    //    description: descriptionHtml || cleanText
    // };

    if (content.includes('description: descriptionHtml || cleanText')) {
        // We have the new code.
        // Let's try to remove the OLD function block.
        // It likely ends with "category: classification.category\n    };\n}"

        // Strategy: Read the file, keep imports and interfaces. 
        // Keep helper functions. 
        // Keep ONLY the version of extractDirectly that has 'description'.

        // Actually, simpler: The previous tool `replace_file_content` probably failed to match the `StartLine` properly or the user manually edited.
        // Let's just rewriting the file content to be clean is safer than regex patching for this specific case.
        // But I don't have the full content in memory. 

        // I'll use a regex to remove the *first* occurrence if the *second* one is the good one?
        // Or finding the one WITHOUT description and removing it.

        // Let's search for the block that DOES NOT contain 'descriptionHtml'
        // This is risky. 

        // Better: I see the line numbers from previous `view_file` (lines 243-296 was old). 
        // The error said "Duplicate function implementation".
        // I will assume the duplicate is at the end or beginning.

        // Let's just delete the part that doesn't have "description: descriptionHtml".
        // Actually, I will read the file, find the index of the function signature.
        // If found, look ahead.
    }
} else {
    console.log('No duplicate found?');
}

// FORCE REWRITE for safety.
// I will just read the current file and if I see duplicates, I will keep the one with "description" field.
