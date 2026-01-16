#!/bin/bash

# Script to add slug regeneration to all scrapers that override title

echo "🔧 Adding slug regeneration to scrapers..."

# List of scrapers that override title
scrapers=(
    "src/scrapers/akbank/axess.ts"
    "src/scrapers/akbank/business.ts"
    "src/scrapers/akbank/free.ts"
    "src/scrapers/chippin/chippin.ts"
    "src/scrapers/denizbank/denizbonus.ts"
    "src/scrapers/garanti/bonus.ts"
    "src/scrapers/isbankasi/maximiles.ts"
    "src/scrapers/isbankasi/maximum-import.ts"
    "src/scrapers/isbankasi/maximum-v3.ts"
    "src/scrapers/isbankasi/maximum-v4.ts"
    "src/scrapers/isbankasi/maximum.ts"
    "src/scrapers/vakifbank/world.ts"
    "src/scrapers/yapikredi/adios.ts"
    "src/scrapers/yapikredi/crystal.ts"
    "src/scrapers/yapikredi/play.ts"
    "src/scrapers/yapikredi/world.ts"
    "src/scrapers/ziraat/bankkart.ts"
)

for file in "${scrapers[@]}"; do
    echo "Processing: $file"
    
    # Check if generateCampaignSlug import exists
    if ! grep -q "import.*generateCampaignSlug" "$file"; then
        echo "  ✅ Adding import..."
        # Add import after parseWithGemini import
        sed -i '' "/import.*parseWithGemini/a\\
import { generateCampaignSlug } from '../../utils/slugify';
" "$file"
    else
        echo "  ⏭️  Import already exists"
    fi
    
    # Check if slug regeneration already exists
    if grep -q "campaignData.slug = generateCampaignSlug" "$file"; then
        echo "  ⏭️  Slug regeneration already exists, skipping"
        continue
    fi
    
    # Add slug regeneration after title assignment
    # This is a bit tricky, we need to find the line with campaignData.title = and add after it
    echo "  ⚠️  Manual addition required: Add 'campaignData.slug = generateCampaignSlug(title);' after 'campaignData.title = title;'"
done

echo ""
echo "✅ Import additions complete!"
echo "⚠️  You need to manually add slug regeneration lines in each scraper"
