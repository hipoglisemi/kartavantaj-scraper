# KartAvantaj Scraper (Worker)

This project acts as the backend worker for KartAvantaj. It scrapes, parses (AI), validates, and auto-fixes campaign data before pushing it to Supabase. This ensures that the frontend application always consumes clean, high-quality data.

## 🏗️ System Architecture

```mermaid
[Scraper Worker] 
      │ 
      ├── 1. Fetches Campaigns 
      ├── 2. AI Parsing (Gemini 2.0)
      ├── 3. Auto-Cleaning (Brand & Installment Info)
      ├── 4. Quality Control & Auto-Fixing
      └── 5. Saves to Supabase
              │
              ▼
         [SUPABASE DB]
              ▲
              │
     [KartAvantaj Web App]
```

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your Supabase credentials & Gemini API Key
```

## Usage

### 🚀 Standard Run (Scrape + AI + Auto-Clean)
Runs the scraper and automatically cleans brand/installment data during parsing.

```bash
npm run scrape:worldcard
# or with explicit AI flag
npx ts-node src/scrapers/worldcard.ts --ai
```

### 🛠️ Maintenance & Quality Control

**Auto-Fix Pipeline:**
Scans all campaigns in Supabase for missing critical fields (like `earning`, `min_spend`) and automatically repairs them using AI.

```bash
npx ts-node src/qualityPipeline.ts --autofix
```

**Manual Scripts:**
- `check_missing_earnings.ts`: Lists campaigns with missing data.
- `fix-installment-badges.ts`: Updates outdated badge texts.

## Environment Variables

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
GOOGLE_GEMINI_KEY=your_gemini_key
```
