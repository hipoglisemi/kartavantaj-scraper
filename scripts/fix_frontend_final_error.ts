import fs from 'fs';
import path from 'path';

const FRONTEND_PATH = '/Users/hipoglisemi/Desktop/kartavantaj';

function fixLastError() {
    console.log('👷 Fixing the LAST implicit any error on line 116...');

    const adminPath = path.join(FRONTEND_PATH, 'src/pages/admin/AdminCampaigns.tsx');
    if (fs.existsSync(adminPath)) {
        let content = fs.readFileSync(adminPath, 'utf8');

        // The error is: const brands = brandStr.split(',').map(b => b.trim()).filter(b => b.length > 0);
        // implicit any on 'b'

        // Fix: Explicitly type 'b' as string
        // Regex needs to be precise
        content = content.replace(
            /\.map\(b => b\.trim\(\)\)\.filter\(b => b\.length > 0\)/,
            ".map((b: string) => b.trim()).filter((b: string) => b.length > 0)"
        );

        fs.writeFileSync(adminPath, content);
        console.log('✅ Fixed line 116 implicit any error.');
    }
}

fixLastError();
