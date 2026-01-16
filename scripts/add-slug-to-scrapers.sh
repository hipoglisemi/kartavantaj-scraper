#!/bin/bash

# Tüm scraper dosyalarında campaignData.title = title; satırından sonra
# slug yenileme kodu ekle

echo "🔧 Scraper'lara Slug Yenileme Ekleniyor..."

# Scraper'ları bul
scrapers=$(find src/scrapers -name "*.ts" -type f)

for file in $scrapers; do
    # campaignData.title = içeren satırları kontrol et
    if grep -q "campaignData.title = " "$file"; then
        echo "✅ $file - Slug yenileme ekleniyor..."
        
        # Eğer zaten slug yenileme varsa atla
        if grep -q "campaignData.slug = generateCampaignSlug" "$file"; then
            echo "   ⏭️  Zaten mevcut, atlanıyor."
            continue
        fi
        
        # generateCampaignSlug import'u ekle (eğer yoksa)
        if ! grep -q "import.*generateCampaignSlug" "$file"; then
            # parseWithGemini import'undan sonra ekle
            sed -i '' "/import.*parseWithGemini/a\\
import { generateCampaignSlug } from '../../utils/slugify';
" "$file"
        fi
        
        echo "   📝 Import eklendi"
    fi
done

echo ""
echo "✅ İşlem tamamlandı!"
echo "⚠️  NOT: Slug yenileme kodunu manuel olarak eklemeniz gerekiyor:"
echo "   campaignData.title = title;"
echo "   campaignData.slug = generateCampaignSlug(title);  // ← Bu satırı ekle"
