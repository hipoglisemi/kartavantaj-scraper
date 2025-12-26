import fs from 'fs';
import path from 'path';

const FRONTEND_PATH = '/Users/hipoglisemi/Desktop/kartavantaj';

function disableAI() {
    console.log('🚀 Final Pass Frontend AI Lockdown...');

    // 2. pages/admin/AdminAI.tsx
    const adminAIPath = path.join(FRONTEND_PATH, 'src/pages/admin/AdminAI.tsx');
    if (fs.existsSync(adminAIPath)) {
        let content = fs.readFileSync(adminAIPath, 'utf8');

        // Disable handleSend (more flexible regex)
        content = content.replace(
            /const handleSend = (async )?\(\) => \{/,
            "const handleSend = () => {\n        alert('AI şu an devre dışı.');\n        return;"
        );

        fs.writeFileSync(adminAIPath, content);
        console.log('✅ Corrected handleSend in AdminAI.tsx');
    }

    console.log('🏁 Frontend AI Lockdown Final Pass complete.');
}

disableAI();
