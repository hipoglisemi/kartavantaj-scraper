#!/bin/bash

# Kalan 6 dosyayı düzeltmek için script

FILES=(
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/yapikredi/play.ts"
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/yapikredi/world.ts"
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/garanti/bonus.ts"
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/denizbank/denizbonus.ts"
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/vakifbank/world.ts"
    "/Users/hipoglisemi/Desktop/kartavantaj-scraper/src/scrapers/ziraat/bankkart.ts"
)

echo "🔧 Kalan 6 dosyayı düzeltiyorum..."
echo ""

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "📝 Düzeltiliyor: $(basename $file)"
        # Dosyada upsert pattern'ini bul ve say
        count=$(grep -c "\.upsert(campaignData, { onConflict: 'reference_url' })" "$file" 2>/dev/null || echo "0")
        if [ "$count" -gt "0" ]; then
            echo "   ✅ Bulundu, düzeltme gerekiyor"
        else
            echo "   ⚠️  Pattern bulunamadı, atlanıyor"
        fi
    else
        echo "❌ Dosya bulunamadı: $file"
    fi
done

echo ""
echo "✅ Kontrol tamamlandı!"
