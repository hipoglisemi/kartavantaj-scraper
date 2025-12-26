import fs from 'fs';
import path from 'path';

const FRONTEND_PATH = '/Users/hipoglisemi/Desktop/kartavantaj';

function disableAI() {
    console.log('🚀 Refining Frontend AI Lockdown...');

    // 3. pages/admin/AdminCampaigns.tsx
    const adminCampaignsPath = path.join(FRONTEND_PATH, 'src/pages/admin/AdminCampaigns.tsx');
    if (fs.existsSync(adminCampaignsPath)) {
        let content = fs.readFileSync(adminCampaignsPath, 'utf8');

        // Disable processGlobalAutoFix
        content = content.replace(
            /const processGlobalAutoFix = async \(.*?\) => \{/,
            "const processGlobalAutoFix = async () => {\n        alert('AI Otomatik Düzeltme şu an devre dışı.');\n        return;"
        );

        // Disable handleBatchReclassify
        content = content.replace(
            /const handleBatchReclassify = async \(.*?\) => \{/,
            "const handleBatchReclassify = async () => {\n        alert('AI Toplu Sınıflandırma şu an devre dışı.');\n        return;"
        );

        // EXTRA: Disable handlePublishAll background AI
        content = content.replace(
            /\/\/ BACKGROUND AUTO-AI ENHANCEMENT/,
            "return; // AI DISABLED // BACKGROUND AUTO-AI ENHANCEMENT"
        );

        fs.writeFileSync(adminCampaignsPath, content);
        console.log('✅ Refined AdminCampaigns.tsx AI tools');
    }

    console.log('🏁 Frontend AI Lockdown refined.');
}

disableAI();
