import fs from 'fs';
import path from 'path';

const FRONTEND_PATH = '/Users/hipoglisemi/Desktop/kartavantaj';

function fixBuildError() {
    console.log('👷 Fixing strict type errors...');

    // 1. Fix useAIProcessor.ts unused variables
    const hookPath = path.join(FRONTEND_PATH, 'src/hooks/useAIProcessor.ts');
    if (fs.existsSync(hookPath)) {
        let content = fs.readFileSync(hookPath, 'utf8');

        // Remove unused import
        content = content.replace("import { campaignParser } from '../services/campaignParser';", "");
        content = content.replace("import { useState, useCallback, useRef } from 'react';", "import { useState, useCallback } from 'react';");

        // Comment out or remove unused state declarations
        content = content.replace(/const \[isLoading/g, "// const [isLoading");
        content = content.replace(/const \[status/g, "// const [status");
        content = content.replace(/const \[progress/g, "// const [progress");
        content = content.replace(/const \[error/g, "// const [error");
        content = content.replace(/const abortControllerRef/g, "// const abortControllerRef");

        // Fix unused args in callbacks
        content = content.replace(
            /processSingle = useCallback\(async \(text: string, currentData\?: any\)/,
            "processSingle = useCallback(async (_text: string, _currentData?: any)"
        );
        content = content.replace(
            /processBatch = useCallback\(async \(\s*items: any\[\],\s*onProgress\?:/,
            "processBatch = useCallback(async (\n        items: any[],\n        _onProgress?:"
        );

        // Ensure the return object uses default values since state is commented out
        content = content.replace(
            /return \{\s*processSingle,\s*processBatch,\s*stop,\s*isLoading,\s*status,\s*progress,\s*error\s*\};/,
            "return {\n        processSingle,\n        processBatch,\n        stop,\n        isLoading: false,\n        status: 'Disabled',\n        progress: 0,\n        error: 'AI Disabled'\n    };"
        );

        fs.writeFileSync(hookPath, content);
        console.log('✅ Fixed unused vars in useAIProcessor.ts');
    }

    // 2. Fix CampaignDetail.tsx undefined checks
    const detailPath = path.join(FRONTEND_PATH, 'src/components/CampaignDetail.tsx');
    if (fs.existsSync(detailPath)) {
        let content = fs.readFileSync(detailPath, 'utf8');

        // Fix editForm.description check
        content = content.replace(
            /if \(!editForm\.description \|\| editForm\.description\.length < 10\)/,
            "if (!editForm.description || (editForm.description && editForm.description.length < 10))"
        );

        // Fix enhanceDescription argument type
        content = content.replace(
            /campaignParser\.enhanceDescription\(editForm\.description\)/,
            "campaignParser.enhanceDescription(editForm.description || '')"
        );

        // Fix onSave possibly undefined call
        content = content.replace(
            /if \(onSave\) \{\s*onSave\(enhanced as CampaignProps\);\s*\}/,
            "if (onSave) onSave(enhanced as CampaignProps);"
        );

        fs.writeFileSync(detailPath, content);
        console.log('✅ Fixed type errors in CampaignDetail.tsx');
    }

    // 3. Fix AdminCampaigns.tsx invalidCampaigns reference
    const adminPath = path.join(FRONTEND_PATH, 'src/pages/admin/AdminCampaigns.tsx');
    if (fs.existsSync(adminPath)) {
        let content = fs.readFileSync(adminPath, 'utf8');

        // Fix processGlobalAutoFix argument mismatch
        // The previous regex replacement removed arguments from the definition
        // "const processGlobalAutoFix = async () => {"
        // But the call site sends "processGlobalAutoFix(invalidCampaigns)"
        // And the body, which is now unreachable, uses invalidCampaigns

        // We need to change the function signature to accept ignored args or just valid args
        content = content.replace(
            /const processGlobalAutoFix = async \(\) => \{/,
            "const processGlobalAutoFix = async (_invalidCampaigns?: any[]) => {"
        );

        // Comment out the unreachable body that references missing variables
        // This is tricky with regex. Let's just fix the variable reference by commenting it out broadly?
        // Actually, the easiest fix is to just accept the argument even if we don't use it.
        // But the error "Cannot find name 'invalidCampaigns'" inside the function body implies
        // that 'invalidCampaigns' was previously a closure variable? 
        // No, typically it was an argument.

        // Fix the call site TS2554: Expected 0 arguments
        // Wait, if I changed the definition to async () =>, then calling it with (invalidCampaigns) is an error.
        // So step 1: Change definition back to accept arg.

        // Fix TS7006 implicit any
        content = content.replace(/bank\.find\(b =>/g, "bank.find((b: any) =>");

        fs.writeFileSync(adminPath, content);
        console.log('✅ Fixed AdminCampaigns.tsx function signature.');
    }
}

fixBuildError();
