#!/bin/bash

# Kartavantaj Scraper - Tüm Scraper'ları AI ile Çalıştırma
# Bu script tüm scraper'ları sırayla AI ile çalıştırır

set -e  # Hata durumunda dur

echo "🚀 Kartavantaj Scraper - Tüm Scraper'lar AI ile Çalışıyor..."
echo "⏰ Başlangıç: $(date)"
echo ""

# Yapı Kredi
echo "💳 YAPI KREDİ KARTLARI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔹 World Card..."
npx tsx src/scrapers/yapikredi/world.ts --ai
echo ""

echo "🔹 Adios Card..."
npx tsx src/scrapers/yapikredi/adios.ts --ai
echo ""

echo "🔹 Play Card..."
npx tsx src/scrapers/yapikredi/play.ts --ai
echo ""

echo "🔹 Crystal Card..."
npx tsx src/scrapers/yapikredi/crystal.ts --ai
echo ""

# Akbank
echo "💳 AKBANK KARTLARI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔹 Axess Card..."
npx tsx src/scrapers/akbank/axess.ts --ai
echo ""

echo "🔹 Business Card..."
npx tsx src/scrapers/akbank/business.ts --ai
echo ""

echo "🔹 Wings Card..."
npx tsx src/scrapers/akbank/wings.ts --ai
echo ""

echo "🔹 Free Card..."
npx tsx src/scrapers/akbank/free.ts --ai
echo ""

# Garanti
echo "💳 GARANTİ BBVA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔹 Bonus Card..."
npx tsx src/scrapers/garanti/bonus.ts --ai
echo ""

# İş Bankası
echo "💳 İŞ BANKASI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔹 Maximum Card..."
npx tsx src/scrapers/isbankasi/maximum.ts --ai
echo ""

# State Banks
echo "💳 DEVLET BANKALARI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔹 Ziraat Bankkart..."
npx tsx src/scrapers/ziraat/bankkart.ts --ai
echo ""

echo "🔹 Halkbank Paraf..."
npx tsx src/scrapers/halkbank/paraf.ts --ai
echo ""

echo "🔹 VakıfBank World..."
npx tsx src/scrapers/vakifbank/world.ts --ai
echo ""

echo "✅ TÜM SCRAPER'LAR TAMAMLANDI!"
echo "⏰ Bitiş: $(date)"
echo ""
echo "📊 Sonraki Adımlar:"
echo "  1. Auto-Fix: npx tsx src/services/autoFixer.ts"
echo "  2. Brand Fix: npm run fix:brands"
echo "  3. Garbage Collector: npx tsx src/garbageCollector.ts"
