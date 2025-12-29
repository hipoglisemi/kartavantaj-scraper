#!/bin/bash

# Add ID Mapper to all scrapers
# This script adds the import and lookup call to all scraper files

SCRAPERS=(
  "src/scrapers/akbank/business.ts"
  "src/scrapers/akbank/free.ts"
  "src/scrapers/akbank/wings.ts"
  "src/scrapers/garanti/bonus.ts"
  "src/scrapers/halkbank/paraf.ts"
  "src/scrapers/isbankasi/maximum.ts"
  "src/scrapers/vakifbank/world.ts"
  "src/scrapers/yapikredi/adios.ts"
  "src/scrapers/yapikredi/crystal.ts"
  "src/scrapers/yapikredi/play.ts"
  "src/scrapers/yapikredi/world.ts"
  "src/scrapers/ziraat/bankkart.ts"
)

echo "🔧 Adding ID Mapper to all scrapers..."
echo ""

for scraper in "${SCRAPERS[@]}"; do
  echo "📝 Processing: $scraper"
  
  # Check if import already exists
  if grep -q "lookupIDs" "$scraper"; then
    echo "   ⏭️  Already has ID mapper, skipping"
  else
    # Add import after campaignOptimizer import
    if grep -q "campaignOptimizer" "$scraper"; then
      sed -i '' "/import.*campaignOptimizer/a\\
import { lookupIDs } from '../../utils/idMapper';
" "$scraper"
      echo "   ✅ Added import"
    else
      # Add import after bankMapper import
      sed -i '' "/import.*bankMapper/a\\
import { lookupIDs } from '../../utils/idMapper';
" "$scraper"
      echo "   ✅ Added import (after bankMapper)"
    fi
    
    # Add ID lookup before upsert
    # Find the line with "campaignData.min_spend = campaignData.min_spend || 0;"
    # and add the ID lookup code after it
    sed -i '' "/campaignData.min_spend = campaignData.min_spend || 0;/a\\
\\
                // Lookup and assign IDs from master tables\\
                const ids = await lookupIDs(\\
                    campaignData.bank,\\
                    campaignData.card_name,\\
                    campaignData.brand,\\
                    campaignData.sector_slug\\
                );\\
                Object.assign(campaignData, ids);
" "$scraper"
    echo "   ✅ Added ID lookup"
  fi
  echo ""
done

echo "✅ Done! All scrapers updated."
