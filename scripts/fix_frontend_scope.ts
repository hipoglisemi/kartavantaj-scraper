import fs from 'fs';
import path from 'path';

const FRONTEND_PATH = '/Users/hipoglisemi/Desktop/kartavantaj';

function fixAdminCampaigns() {
    console.log('👷 Fixing AdminCampaigns.tsx scope issues...');

    // The previous regex replace changed usages of "invalidCampaigns" to "(_invalidCampaigns || [])" GLOBALLY.
    // This broke local variables named "invalidCampaigns" inside other scopes (like useEffect).

    const adminPath = path.join(FRONTEND_PATH, 'src/pages/admin/AdminCampaigns.tsx');
    if (fs.existsSync(adminPath)) {
        let content = fs.readFileSync(adminPath, 'utf8');

        // REVERT accidental global replacements in the useEffect and handleAutoFixAllInvalid blocks
        // The original code had: "const invalidCampaigns = ..."
        // It got changed to: "const (_invalidCampaigns || []) = ..." which is syntax error or logical error usage.

        // Fix 1: Restore useEffect variable declaration
        // const (_invalidCampaigns || []) = allCampaigns.filter
        content = content.replace(
            /const \(_invalidCampaigns \|\| \[\]\) = allCampaigns\.filter/,
            "const invalidCampaigns = allCampaigns.filter"
        );

        // Fix 2: Restore usages inside useEffect
        // if ((_invalidCampaigns || []).length > 0) -> if (invalidCampaigns.length > 0)
        // But ONLY in the block that defines `invalidCampaigns` locally.
        // It's hard to distinguish with simple regex globally.
        // However, we can see from the error log where it failed (lines 407, 408, 615, 622)
        // Those lines are OUTSIDE processGlobalAutoFix, so they refer to local variables.

        // Let's indiscriminately revert usages that look like property access on the polyfill
        // EXCEPT inside processGlobalAutoFix (which we'll just clean up entirely).

        // Actually, the cleanest way is to:
        // 1. Revert ALL `(_invalidCampaigns || [])` back to `invalidCampaigns`
        // 2. Then properly type the function signature and unused variable differently.

        // Revert global change first
        content = content.replace(/\(_invalidCampaigns \|\| \[\]\)/g, "invalidCampaigns");

        // Now fix the function signature correctly
        // const processGlobalAutoFix = async (_invalidCampaigns?: any[]) => {
        // If we leave the argument as `_invalidCampaigns`, accessing `invalidCampaigns` inside will error.
        // So let's name the argument `invalidCampaigns` but maybe suppress unused warning if needed?
        // But wait, the function body is reachable (the code is there), just early returned.
        // TS might complain about unused arg because of early return.

        // Solution:
        content = content.replace(
            /const processGlobalAutoFix = async \(_invalidCampaigns\?: any\[\]\) => \{/,
            "const processGlobalAutoFix = async (invalidCampaignsList?: any[]) => {"
        );

        // Now inside the function, we need to map invalidCampaigns -> invalidCampaignsList
        // Or better: just replace the internal usage variable name.
        // But the regex hotfix is messy.

        // ALTERNATIVE STRATEGY:
        // Restore variable names to `invalidCampaigns` everywhere.
        // Change function signature to `async (invalidCampaigns: any[] = [])`.
        // Add `// @ts-ignore` or simply use the variable in a fake console log to avoid unused error.

        content = content.replace(
            /const processGlobalAutoFix = async \(.*?\) => \{/,
            "const processGlobalAutoFix = async (invalidCampaigns: any[] = []) => {\n        // Prevent unused var error\n        void invalidCampaigns;"
        );

        // Fix remaining implicit any errors 
        // e.g. Parameter 'b' implicitly has an 'any' type.
        // Previous fix tried replacing `banks.find(b =>` with `banks.find((b: any) =>`
        // But maybe the regex didn't match exactly due to whitespace or variable name differences?
        // Let's try more variations.

        content = content.replace(/banks\.find\(b =>/g, "banks.find((b: any) =>");
        content = content.replace(/banks\.find\(\s*b\s*=>/g, "banks.find((b: any) =>");

        content = content.replace(/bank\.cards\.find\(c =>/g, "bank.cards.find((c: any) =>");
        content = content.replace(/bank\.cards\.find\(\s*c\s*=>/g, "bank.cards.find((c: any) =>");

        fs.writeFileSync(adminPath, content);
        console.log('✅ Reverted variable mangling in AdminCampaigns.tsx and fixed scope.');
    }
}

fixAdminCampaigns();
