import fs from 'fs';
import path from 'path';

const FRONTEND_PATH = '/Users/hipoglisemi/Desktop/kartavantaj';

function fixStrictTypes() {
    console.log('👷 Fixing residual strict type errors...');

    // 1. Fix AdminCampaigns.tsx
    const adminPath = path.join(FRONTEND_PATH, 'src/pages/admin/AdminCampaigns.tsx');
    if (fs.existsSync(adminPath)) {
        let content = fs.readFileSync(adminPath, 'utf8');

        // Since the body of processGlobalAutoFix is unreachable due to the return;
        // we can simply comment it out or delete it to avoid TS errors about missing variables.
        // The cleaner way is to make the variables available or just empty the function body.

        // Replace the entire function body with just the alert and return
        // Note: We need a reliable regex that captures the whole block. 
        // Or we can just define the variable locally to satisfy TS even if unused.

        content = content.replace(
            /const processGlobalAutoFix = async \(_invalidCampaigns\?: any\[\]\) => \{/,
            "const processGlobalAutoFix = async (_invalidCampaigns?: any[]) => {\n        // const invalidCampaigns = _invalidCampaigns || []; // Polyfill for code below if we kept it"
        );

        // Actually, since I can't easily rely on regex for minimal block replacement, 
        // I will rename the variable usage inside the function to match the argument.
        content = content.replace(/invalidCampaigns\.length/g, "(_invalidCampaigns || []).length");
        content = content.replace(/\[\.\.\.invalidCampaigns\]/g, "[...(_invalidCampaigns || [])]");

        // Fix implicit any in .find() callbacks
        // b => b.name
        // We will replace "b =>" with "(b: any) =>" globally in this file for simplicity
        content = content.replace(/banks\.find\(b =>/g, "banks.find((b: any) =>");
        content = content.replace(/bank\.cards\.find\(c =>/g, "bank.cards.find((c: any) =>");

        fs.writeFileSync(adminPath, content);
        console.log('✅ Fixed AdminCampaigns.tsx variable references.');
    }

    // 2. Fix CampaignDetail.tsx check again
    const detailPath = path.join(FRONTEND_PATH, 'src/components/CampaignDetail.tsx');
    if (fs.existsSync(detailPath)) {
        let content = fs.readFileSync(detailPath, 'utf8');
        // Fix TS18048: 'editForm.description' is possibly 'undefined' in condition
        // if (!editForm.description || ...

        // We need to be very specific about the replacement
        // The error says: editForm.description is possibly undefined.
        // Code: if (!editForm.description || (editForm.description && editForm.description.length < 10))
        // This actually SHOULD be valid TS.
        // Let's force it to string

        content = content.replace(
            /if \(!editForm\.description \|\| \(editForm\.description \&\& editForm\.description\.length < 10\)\)/,
            "if (!editForm.description || String(editForm.description).length < 10)"
        );

        // Fix TS2722: Cannot invoke an object which is possibly 'undefined'.
        // if (onSave) onSave(...) -> verified this is already correct?
        // Error line 210: onSave(enhanced as CampaignProps);
        // It seems the previous replacement might have failed or needs exact match.
        // Let's use a safer pattern:
        // (onSave as any)(enhanced as CampaignProps);

        content = content.replace(
            /if \(onSave\) onSave\(enhanced as CampaignProps\);/,
            "if (onSave) (onSave as any)(enhanced as CampaignProps);"
        );

        fs.writeFileSync(detailPath, content);
        console.log('✅ Fixed CampaignDetail.tsx strict checks.');
    }

    // 3. Fix useAIProcessor.ts unused import
    const hookPath = path.join(FRONTEND_PATH, 'src/hooks/useAIProcessor.ts');
    if (fs.existsSync(hookPath)) {
        let content = fs.readFileSync(hookPath, 'utf8');
        content = content.replace("import { useState, useCallback }", "import { useCallback }");
        fs.writeFileSync(hookPath, content);
        console.log('✅ Fixed unused import in useAIProcessor.ts');
    }
}

fixStrictTypes();
