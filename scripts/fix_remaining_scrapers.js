#!/usr/bin/env node

/**
 * Bu script, kalan 9 scraper dosyasını otomatik olarak düzeltir
 * Eski upsert kodunu yeni ID-bazlı slug sistemi ile değiştirir
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
    '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/akbank/free.ts',
    '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/chippin/chippin.ts',
    '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/denizbank/denizbonus.ts',
    '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/garanti/bonus.ts',
    '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/vakifbank/world.ts',
    '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/yapikredi/adios.ts',
    '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/yapikredi/crystal.ts',
    '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/yapikredi/play.ts',
    '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/yapikredi/world.ts',
    '/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/ziraat/bankkart.ts',
];

// Eski pattern (regex ile bulacağız)
const oldPattern = /(\s+)(const { error } = await supabase\s+\.from\('campaigns'\)\s+\.upsert\(campaignData, { onConflict: 'reference_url' }\);)\s+(if \(error\) {[\s\S]*?} else {[\s\S]*?})/gm;

// Yeni kod (ID-bazlı sistem)
const newCode = `$1// ID-BASED SLUG SYSTEM
$1const { data: existing } = await supabase
$1    .from('campaigns')
$1    .select('id')
$1    .eq('reference_url', fullUrl || url)
$1    .single();

$1if (existing) {
$1    const finalSlug = generateCampaignSlug(title, existing.id);
$1    const { error } = await supabase
$1        .from('campaigns')
$1        .update({ ...campaignData, slug: finalSlug })
$1        .eq('id', existing.id);
$1    if (error) {
$1        console.error(\`      ❌ Update Error: \${error.message}\`);
$1    } else {
$1        console.log(\`      ✅ Updated: \${title.substring(0, 30)}... (\${finalSlug})\`);
$1    }
$1} else {
$1    const { data: inserted, error: insertError } = await supabase
$1        .from('campaigns')
$1        .insert(campaignData)
$1        .select('id')
$1        .single();
$1    if (insertError) {
$1        console.error(\`      ❌ Insert Error: \${insertError.message}\`);
$1    } else if (inserted) {
$1        const finalSlug = generateCampaignSlug(title, inserted.id);
$1        await supabase
$1            .from('campaigns')
$1            .update({ slug: finalSlug })
$1            .eq('id', inserted.id);
$1        console.log(\`      ✅ Inserted: \${title.substring(0, 30)}... (\${finalSlug})\`);
$1    }
$1}`;

let totalFixed = 0;
let totalErrors = 0;

console.log('🔧 Scraper Düzeltme Script\'i Başlatıldı...\n');

for (const filePath of filesToFix) {
    try {
        console.log(`📝 İşleniyor: ${path.basename(filePath)}`);

        if (!fs.existsSync(filePath)) {
            console.log(`   ⚠️  Dosya bulunamadı, atlanıyor...\n`);
            totalErrors++;
            continue;
        }

        let content = fs.readFileSync(filePath, 'utf8');

        // Önce eski pattern'i bulalım
        const matches = content.match(oldPattern);

        if (!matches || matches.length === 0) {
            console.log(`   ⚠️  Eski pattern bulunamadı, atlanıyor...\n`);
            totalErrors++;
            continue;
        }

        // Replace işlemi
        const newContent = content.replace(oldPattern, newCode);

        if (newContent === content) {
            console.log(`   ⚠️  Değişiklik yapılamadı, atlanıyor...\n`);
            totalErrors++;
            continue;
        }

        // Dosyayı kaydet
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`   ✅ Başarıyla düzeltildi!\n`);
        totalFixed++;

    } catch (error) {
        console.error(`   ❌ Hata: ${error.message}\n`);
        totalErrors++;
    }
}

console.log('═'.repeat(50));
console.log(`✅ Tamamlandı!`);
console.log(`   Düzeltilen: ${totalFixed} dosya`);
console.log(`   Hata: ${totalErrors} dosya`);
console.log('═'.repeat(50));
