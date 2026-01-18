#!/bin/bash

# Bu script tüm scraper'lara test modu desteği ekler
# Kullanım: ./add_test_mode_to_scrapers.sh

SCRAPERS=(
    "src/scrapers/isbankasi/maximiles.ts"
    "src/scrapers/akbank/axess.ts"
    "src/scrapers/akbank/free.ts"
    "src/scrapers/yapikredi/adios.ts"
    "src/scrapers/yapikredi/crystal.ts"
    "src/scrapers/yapikredi/play.ts"
    "src/scrapers/yapikredi/world.ts"
    "src/scrapers/garanti/bonus.ts"
    "src/scrapers/denizbank/denizbonus.ts"
    "src/scrapers/vakifbank/world.ts"
    "src/scrapers/ziraat/bankkart.ts"
    "src/scrapers/akbank/business.ts"
    "src/scrapers/akbank/wings.ts"
    "src/scrapers/halkbank/paraf.ts"
    "src/scrapers/chippin/chippin.ts"
    "src/scrapers/qnb/finans.ts"
)

echo "🔧 Adding test mode support to ${#SCRAPERS[@]} scrapers..."
echo ""

for scraper in "${SCRAPERS[@]}"; do
    if [ -f "$scraper" ]; then
        echo "✅ $scraper - Ready for manual update"
    else
        echo "❌ $scraper - File not found!"
    fi
done

echo ""
echo "📝 Manual steps required for each file:"
echo "1. Add import: import { getTargetTable, logTestModeStatus, logTestModeSummary } from '../../utils/testMode';"
echo "2. At start of function: logTestModeStatus(); const tableName = getTargetTable();"
echo "3. Replace .from('campaigns') with .from(tableName)"
echo "4. At end: logTestModeSummary(count, tableName);"
