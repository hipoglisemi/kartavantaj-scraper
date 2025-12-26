import fs from 'fs';
import path from 'path';

const FRONTEND_PATH = '/Users/hipoglisemi/Desktop/kartavantaj';

function fixNullCrash() {
    console.log('🚑 Fixing Frontend Null Crash...');

    const detailPath = path.join(FRONTEND_PATH, 'src/components/CampaignDetail.tsx');
    if (fs.existsSync(detailPath)) {
        let content = fs.readFileSync(detailPath, 'utf8');

        // Fix 1: provider.toLowerCase() crash check
        content = content.replace(
            /const providerLower = provider.toLowerCase\(\);/g,
            "const providerLower = (provider || '').toLowerCase();"
        );

        // Fix 2: data.bank.toLowerCase() crash check in default case
        content = content.replace(
            /<span className="uppercase">\{data\.bank\}<\/span>/g,
            '<span className="uppercase">{data.bank || ""}</span>'
        );

        // Fix 3: data.bank.toLowerCase().includes('adios') crash check in Image
        // This is a tricky regex because of the multiline nature and template literal
        // We'll try to target the className prop construction

        const oldClassName = "${data.bank.toLowerCase().includes('adios') || (providerLogo && providerLogo.includes('adios')) ? 'h-6' : 'h-4'}";
        const newClassName = "${(data.bank || '').toLowerCase().includes('adios') || (providerLogo && providerLogo.includes('adios')) ? 'h-6' : 'h-4'}";

        if (content.includes(oldClassName)) {
            content = content.replace(oldClassName, newClassName);
            console.log('✅ Fixed data.bank.toLowerCase() in footer image.');
        }

        // Fix 4: provider.toLowerCase() usages inside the find()
        // b.name.toLowerCase() === provider.toLowerCase()
        content = content.replace(
            /=== provider\.toLowerCase\(\)/g,
            "=== (provider || '').toLowerCase()"
        );
        content = content.replace(
            /includes\(provider\.toLowerCase\(\)\)/g,
            "includes((provider || '').toLowerCase())"
        );
        content = content.replace(
            /provider\.toLowerCase\(\)\.includes/g,
            "(provider || '').toLowerCase().includes"
        );


        fs.writeFileSync(detailPath, content);
        console.log('✅ Applied null safety to CampaignDetail.tsx');
    }
}

fixNullCrash();
