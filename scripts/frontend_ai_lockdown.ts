import fs from 'fs';
import path from 'path';

const FRONTEND_PATH = '/Users/hipoglisemi/Desktop/kartavantaj';

function disableAI() {
    console.log('🚀 Global Frontend AI Lockdown started...');

    // 1. services/campaignParser.ts
    const parserPath = path.join(FRONTEND_PATH, 'src/services/campaignParser.ts');
    if (fs.existsSync(parserPath)) {
        let content = fs.readFileSync(parserPath, 'utf8');

        // Add global flag
        if (!content.includes('const DISABLE_AI = true;')) {
            content = "const DISABLE_AI = true;\n" + content;
            console.log('✅ Added DISABLE_AI flag to campaignParser.ts');
        }

        // Add early return to parseWithGemini
        content = content.replace(
            /async parseWithGemini\(text: string, currentData\?: any\): Promise<Partial<CampaignProps>> \{/,
            "async parseWithGemini(text: string, currentData?: any): Promise<Partial<CampaignProps>> {\n        if (DISABLE_AI) return {};"
        );

        // Add early return to reclassify
        content = content.replace(
            /async reclassify\(campaign: CampaignProps\): Promise<Partial<CampaignProps>> \{/,
            "async reclassify(campaign: CampaignProps): Promise<Partial<CampaignProps>> {\n        if (DISABLE_AI) return {};"
        );

        // Add early return to learnRule
        content = content.replace(
            /async learnRule\(userFeedback: string\): Promise<string> \{/,
            "async learnRule(userFeedback: string): Promise<string> {\n        if (DISABLE_AI) return 'AI Disabled';"
        );

        fs.writeFileSync(parserPath, content);
    }

    // 2. pages/admin/AdminAI.tsx
    const adminAIPath = path.join(FRONTEND_PATH, 'src/pages/admin/AdminAI.tsx');
    if (fs.existsSync(adminAIPath)) {
        let content = fs.readFileSync(adminAIPath, 'utf8');

        // Disable Chat handleSend
        content = content.replace(
            /const handleSend = async \(\) => \{/,
            "const handleSend = async () => {\n        alert('AI şu an devre dışı.');\n        return;"
        );

        // Disable Training handleTrain
        content = content.replace(
            /const handleTrain = async \(\) => \{/,
            "const handleTrain = async () => {\n        alert('AI eğitimi şu an devre dışı.');\n        return;"
        );

        fs.writeFileSync(adminAIPath, content);
        console.log('✅ Disabled AdminAI.tsx tools');
    }

    // 3. pages/admin/AdminCampaigns.tsx
    const adminCampaignsPath = path.join(FRONTEND_PATH, 'src/pages/admin/AdminCampaigns.tsx');
    if (fs.existsSync(adminCampaignsPath)) {
        let content = fs.readFileSync(adminCampaignsPath, 'utf8');

        // This file has "processGlobalAutoFix" and "handleReclassify"
        content = content.replace(
            /const processGlobalAutoFix = async \(\) => \{/,
            "const processGlobalAutoFix = async () => {\n        alert('AI Otomatik Düzeltme şu an devre dışı.');\n        return;"
        );

        content = content.replace(
            /const handleBatchReclassify = async \(\) => \{/,
            "const handleBatchReclassify = async () => {\n        alert('AI Toplu Sınıflandırma şu an devre dışı.');\n        return;"
        );

        fs.writeFileSync(adminCampaignsPath, content);
        console.log('✅ Disabled AdminCampaigns.tsx AI tools');
    }

    console.log('🏁 Frontend AI Lockdown complete.');
}

disableAI();
