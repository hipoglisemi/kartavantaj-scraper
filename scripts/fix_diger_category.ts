import { supabase } from '../src/utils/supabase';

/**
 * Fix campaigns in "Diğer" category that should be in specific categories
 */

interface Fix {
    id: number;
    title: string;
    old_category: string;
    new_category: string;
    reason: string;
}

async function fixDigerCategory(dryRun: boolean = true) {
    console.log('🔧 "Diğer" kategorisindeki kampanyaları kontrol ediyorum...\n');

    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, category, brand, merchant, description')
        .eq('category', 'Diğer')
        .order('id', { ascending: false });

    if (!campaigns) return;

    const fixes: Fix[] = [];

    // Category mapping based on merchant/brand
    const categoryMappings: Record<string, string> = {
        // Mobilya & Dekorasyon
        'Koçtaş': 'Mobilya & Dekorasyon',
        'Bauhaus': 'Mobilya & Dekorasyon',
        'Karaca': 'Mobilya & Dekorasyon',
        'Özdilek': 'Mobilya & Dekorasyon',
        'İdaş': 'Mobilya & Dekorasyon',
        'Korkmaz': 'Mobilya & Dekorasyon',

        // Seyahat
        'LoungeMe': 'Seyahat',
        'Lounge': 'Seyahat',

        // Otomotiv
        'Vale': 'Otomotiv',
        'Otopark': 'Otomotiv',

        // Sigorta
        'Sigorta': 'Sigorta',

        // Vergi
        'Vergi': 'Vergi & Kamu',

        // Sağlık
        'Sağlık': 'Sağlık',
    };

    for (const c of campaigns) {
        const fullText = (c.title + ' ' + (c.merchant || '') + ' ' + (c.description || '')).toLowerCase();

        let newCategory = '';

        // Check merchant/brand first
        for (const [keyword, category] of Object.entries(categoryMappings)) {
            if (fullText.includes(keyword.toLowerCase())) {
                newCategory = category;
                break;
            }
        }

        if (newCategory && newCategory !== c.category) {
            fixes.push({
                id: c.id,
                title: c.title,
                old_category: c.category,
                new_category: newCategory,
                reason: `Merchant/açıklama "${Object.keys(categoryMappings).find(k => fullText.includes(k.toLowerCase()))}" içeriyor`
            });
        }
    }

    console.log(`📊 ${fixes.length} kampanya düzeltilecek\n`);

    if (fixes.length === 0) {
        console.log('✅ Düzeltilecek kampanya yok!\n');
        return;
    }

    // Print preview
    console.log('═'.repeat(60));
    console.log('DÜZELTMELER');
    console.log('═'.repeat(60));

    fixes.forEach((fix, idx) => {
        console.log(`\n${idx + 1}. ID ${fix.id}: ${fix.title.substring(0, 50)}`);
        console.log(`   Eski: ${fix.old_category}`);
        console.log(`   Yeni: ${fix.new_category}`);
        console.log(`   Sebep: ${fix.reason}`);
    });

    if (dryRun) {
        console.log('\n🔒 DRY RUN MODE - No changes made to database.');
        console.log('   Run with --execute flag to apply fixes.\n');
        return;
    }

    // Execute fixes
    console.log('\n💾 Applying fixes...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const fix of fixes) {
        const { error } = await supabase
            .from('campaigns')
            .update({ category: fix.new_category })
            .eq('id', fix.id);

        if (error) {
            console.error(`❌ Error fixing ID ${fix.id}:`, error.message);
            errorCount++;
        } else {
            console.log(`✅ Fixed ID ${fix.id}: ${fix.old_category} → ${fix.new_category}`);
            successCount++;
        }
    }

    console.log(`\n═'.repeat(60)`);
    console.log(`✅ Fix complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('═'.repeat(60));
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (dryRun) {
    console.log('🔍 Running in DRY RUN mode...\n');
} else {
    console.log('⚡ Running in EXECUTE mode...\n');
}

fixDigerCategory(dryRun)
    .then(() => {
        console.log('\n✨ Script finished.');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });
