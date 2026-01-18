#!/usr/bin/env python3
"""
Kalan 6 scraper dosyasını otomatik olarak düzeltir.
Eski upsert kodunu yeni ID-bazlı slug sistemi ile değiştirir.
"""

import re

files_to_fix = [
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/yapikredi/play.ts",
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/yapikredi/world.ts",
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/garanti/bonus.ts",
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/denizbank/denizbonus.ts",
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/vakifbank/world.ts",
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/ziraat/bankkart.ts",
]

# Eski pattern (multi-line regex)
old_pattern = r"""(\s+)const { error } = await supabase
\s+\.from\('campaigns'\)
\s+\.upsert\(campaignData, { onConflict: 'reference_url' }\);

\s+if \(error\) {
\s+console\.error\(`\s+❌ (?:Supabase Error|Error|DB Error for "[^"]*"): \$\{error(?:\?\.message \|\| 'Unknown error'|\.message)\}`\);
\s+} else {
\s+console\.log\(`\s+✅ (?:Saved|Successfully saved/updated): \$\{(?:campaignData\.title|title(?:\.substring\(0, 30\))?\.\.\.)\}`\);
\s+}"""

# Yeni kod
new_code_template = """{indent}// ID-BASED SLUG SYSTEM
{indent}const {{ data: existing }} = await supabase
{indent}    .from('campaigns')
{indent}    .select('id')
{indent}    .eq('reference_url', fullUrl)
{indent}    .single();

{indent}if (existing) {{
{indent}    const finalSlug = generateCampaignSlug(title, existing.id);
{indent}    const {{ error }} = await supabase
{indent}        .from('campaigns')
{indent}        .update({{ ...campaignData, slug: finalSlug }})
{indent}        .eq('id', existing.id);
{indent}    if (error) {{
{indent}        console.error(`      ❌ Update Error: ${{error.message}}`);
{indent}    }} else {{
{indent}        console.log(`      ✅ Updated: ${{title.substring(0, 30)}}... (${{finalSlug}})`);
{indent}    }}
{indent}}} else {{
{indent}    const {{ data: inserted, error: insertError }} = await supabase
{indent}        .from('campaigns')
{indent}        .insert(campaignData)
{indent}        .select('id')
{indent}        .single();
{indent}    if (insertError) {{
{indent}        console.error(`      ❌ Insert Error: ${{insertError.message}}`);
{indent}    }} else if (inserted) {{
{indent}        const finalSlug = generateCampaignSlug(title, inserted.id);
{indent}        await supabase
{indent}            .from('campaigns')
{indent}            .update({{ slug: finalSlug }})
{indent}            .eq('id', inserted.id);
{indent}        console.log(`      ✅ Inserted: ${{title.substring(0, 30)}}... (${{finalSlug}})`);
{indent}    }}
{indent}}}"""

total_fixed = 0
total_errors = 0

print("🔧 Scraper Düzeltme Script'i Başlatıldı...\n")

for file_path in files_to_fix:
    try:
        print(f"📝 İşleniyor: {file_path.split('/')[-1]}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the old pattern
        match = re.search(old_pattern, content, re.MULTILINE)
        
        if not match:
            print(f"   ⚠️  Eski pattern bulunamadı, atlanıyor...\n")
            total_errors += 1
            continue
        
        # Get indentation from the match
        indent = match.group(1)
        
        # Generate new code with correct indentation
        new_code = new_code_template.format(indent=indent)
        
        # Replace
        new_content = re.sub(old_pattern, new_code, content, count=1, flags=re.MULTILINE)
        
        if new_content == content:
            print(f"   ⚠️  Değişiklik yapılamadı, atlanıyor...\n")
            total_errors += 1
            continue
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"   ✅ Başarıyla düzeltildi!\n")
        total_fixed += 1
        
    except Exception as e:
        print(f"   ❌ Hata: {e}\n")
        total_errors += 1

print("=" * 50)
print(f"✅ Tamamlandı!")
print(f"   Düzeltilen: {total_fixed} dosya")
print(f"   Hata: {total_errors} dosya")
print("=" * 50)
