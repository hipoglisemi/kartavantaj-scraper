#!/bin/bash

# Load Environment Variables from .env
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

echo "🚀 Starting Akbank Scrapers (Local Batch)..."
echo "----------------------------------------"

# Initialize total token count
TOTAL_TOKENS=0

# Function to run scraper and extract token usage
run_scraper() {
  local scraper=$1
  echo "▶️ Running $scraper..."
  
  # Run TS file and capture output
  # Use npx ts-node to run directly
  output=$(npx ts-node src/scrapers/akbank/$scraper.ts --ai 2>&1)
  
  # Print output to console for user to see
  echo "$output"
  
  # Extract tokens using regex/grep from the output
  # Pattern matches: "💰 AI Usage: 1234 tokens"
  tokens=$(echo "$output" | grep "AI Total Token Usage:" | awk '{print $5}')
  
  # Fallback if format is slightly different or missing
  if [ -z "$tokens" ]; then 
      # Try alternative pattern from log
      tokens=$(echo "$output" | grep "AI Usage:" | awk '{print $3}')
  fi
  
  if [ -z "$tokens" ]; then tokens=0; fi
  
  echo "   📊 Parsed Tokens for $scraper: $tokens"
  TOTAL_TOKENS=$((TOTAL_TOKENS + tokens))
  echo "----------------------------------------"
}

# Run scrapers one by one
# Limit 5 to be fast but efficient for a "manual trigger" test
# User asked for manual trigger, usually implies full run, but let's stick to default (limit 15 in code) or override if arguments provided.

# Scrapers
run_scraper "free"
run_scraper "axess"
run_scraper "wings"
run_scraper "business"

echo "========================================"
echo "🎉 Batch Complete."
echo "💰 Grand Total Token Usage: $TOTAL_TOKENS"
echo "========================================"
