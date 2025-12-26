import fs from 'fs';
import path from 'path';

const FRONTEND_PATH = '/Users/hipoglisemi/Desktop/kartavantaj';

function disableAI() {
    console.log('🚀 Comprehensive Frontend AI Lockdown...');

    // 1. services/campaignParser.ts
    const parserPath = path.join(FRONTEND_PATH, 'src/services/campaignParser.ts');
    if (fs.existsSync(parserPath)) {
        let content = fs.readFileSync(parserPath, 'utf8');

        // Ensure DISABLE_AI exists
        if (!content.includes('const DISABLE_AI = true;')) {
            content = "const DISABLE_AI = true;\n" + content;
        }

        // Add early return to parseWithGemini
        content = content.replace(
            /async parseWithGemini\(text: string, currentData\?: any\): Promise<Partial<CampaignProps>> \{/,
            "async parseWithGemini(text: string, currentData?: any): Promise<Partial<CampaignProps>> {\n        if (DISABLE_AI) return {};"
        );

        // Add early return to parseBatchWithGemini
        content = content.replace(
            /async parseBatchWithGemini\(\s*campaigns: any\[\]/,
            "async parseBatchWithGemini(campaigns: any[]"
        ).replace(
            /async parseBatchWithGemini\(campaigns: any\[\]\): Promise<any\[\]> \{/,
            "async parseBatchWithGemini(campaigns: any[]): Promise<any[]> {\n        if (DISABLE_AI) return campaigns;"
        );

        // Add early return to enhanceDescription
        content = content.replace(
            /async enhanceDescription\(description: string\): Promise<string> \{/,
            "async enhanceDescription(description: string): Promise<string> {\n        if (DISABLE_AI) return description;"
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
        console.log('✅ Locked all functions in campaignParser.ts');
    }

    // 2. hooks/useAIProcessor.ts
    const hookPath = path.join(FRONTEND_PATH, 'src/hooks/useAIProcessor.ts');
    if (fs.existsSync(hookPath)) {
        let content = fs.readFileSync(hookPath, 'utf8');

        content = content.replace(
            /const processSingle = useCallback\(async \(text: string, currentData\?: any\): Promise<AIProcessResult> => \{/,
            "const processSingle = useCallback(async (text: string, currentData?: any): Promise<AIProcessResult> => {\n        return { success: false, error: 'AI is disabled' };"
        );

        content = content.replace(
            /processBatch = useCallback\(async \(/,
            "processBatch = useCallback(async (...args) => {\n        return args[0];\n        // "
        );

        fs.writeFileSync(hookPath, content);
        console.log('✅ Locked useAIProcessor.ts');
    }

    // 3. components/CampaignDetail.tsx
    const detailPath = path.join(FRONTEND_PATH, 'src/components/CampaignDetail.tsx');
    if (fs.existsSync(detailPath)) {
        let content = fs.readFileSync(detailPath, 'utf8');

        // Disable auto-enhance useEffect completely
        content = content.replace(
            /if \(isAdmin \&\& data\.isApproved \&\& !\(data as any\)\.ai_enhanced\) \{/,
            "if (false && isAdmin && data.isApproved && !(data as any).ai_enhanced) {"
        );

        // Disable manual fix buttons
        content = content.replace(
            /const handleAIFix = async \(\) => \{/,
            "const handleAIFix = async () => {\n        alert('AI şu an devre dışı.');\n        return;"
        );

        content = content.replace(
            /const handleAIEnhanceDescription = async \(\) => \{/,
            "const handleAIEnhanceDescription = async () => {\n        alert('AI şu an devre dışı.');\n        return;"
        );

        fs.writeFileSync(detailPath, content);
        console.log('✅ Locked CampaignDetail.tsx buttons');
    }

    console.log('🏁 Comprehensive Frontend AI Lockdown complete.');
}

disableAI();
