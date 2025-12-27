# Quality Audit & Auto-Fix System

## Overview

Automated quality control system that processes campaigns through AI-powered fixes before publishing to the public site.

## Workflow: Scrape → Audit → AI Fix → Publish

```
┌─────────────┐
│   Scraper   │ Fetches campaigns from bank websites
└──────┬──────┘
       │ INSERT/UPDATE with publish_status='processing'
       ▼
┌─────────────┐
│   Audit     │ Detects quality issues (dates, taksit, cards, etc.)
└──────┬──────┘
       │ Saves to campaign_quality_audits
       ▼
┌─────────────┐
│  AI Auto-   │ Generates patches with confidence scores
│    Fix      │ • ≥0.80: Auto-apply → publish_status='clean'
└──────┬──────┘ • 0.55-0.79: Needs review → publish_status='needs_review'
       │        • <0.55: Failed → publish_status='needs_review'
       ▼
┌─────────────┐
│   Publish   │ Public site shows only publish_status='clean'
└─────────────┘
```

## Components

### 1. Database Schema

**campaigns table:**
- `publish_status` (TEXT): 'processing' | 'clean' | 'needs_review'
- `publish_updated_at` (TIMESTAMPTZ): Last status update

**campaign_quality_audits table:**
- `ai_status` (TEXT): 'pending' | 'auto_applied' | 'needs_review' | 'failed'
- `ai_confidence` (NUMERIC): 0.0-1.0 confidence score
- `ai_patch` (JSONB): Suggested fixes
- `ai_notes` (TEXT): AI explanation
- `status` (TEXT): 'open' | 'fixed' | 'ignored' | 'needs_rescrape'

### 2. AI Auto-Fix Engine

**Location:** `src/services/aiAutoFix.ts`

**Issue-Specific Prompts:**
- `discount_missing_taksit`: Extract installment info
- `date_year_mismatch`: Correct year inference
- `date_range_parse_bug`: Parse "1-31 Aralık" correctly
- `eligible_cards_missing`: Extract card names
- `participation_sms_missed`: Detect SMS signals
- `spend_zero_with_signals`: Extract min spend
- `cap_missing`: Extract max discount
- `percent_missing`: Extract percentage

**Confidence Thresholds:**
- **≥ 0.80**: Auto-apply (no human review)
- **0.55-0.79**: Needs human review
- **< 0.55**: Failed (requires manual intervention)
- **Retry AI**: Herhangi bir kampanya için AI sürecini manuel olarak tetikler.

## Panel Kullanımı (Admin Panel)

Kalite denetimi süreci artık `/panel/quality-audit` sayfasından görsel olarak yönetilebilir:

1.  **Dashboard Özet**: Panel üstündeki kartlardan toplam, temiz, inceleme bekleyen ve hatalı kampanya sayılarını görebilirsiniz.
2.  **Sekmeler**:
    *   **İnceleme Bekleyen**: AI tarafından işlenmiş ancak manuel onay bekleyen veya veri kalitesi düşük olduğu için takılmış kampanyalar.
    *   **Sırada**: Şu an scraper tarafından çekilen veya AI kuyruğuna alınmış kampanyalar.
    *   **Temiz (Yayında)**: Başarıyla doğrulanmış ve sitede görünen kampanyalar.
    *   **Hatalı / Eksik**: Scraper hatası almış veya AI'nın düzeltemediği kritik hataları olan kampanyalar.
3.  **İnceleme ve Onay**: 
    *   "Aç" butonu ile kampanya detaylarını açın.
    *   AI'nın önerdiği değişiklikleri (Diff tablosu) inceleyin.
    *   **"AI Önerisini Uygula"**: Önerilen yamayı kampanya verisine yazar ve durumu `clean` yapar.
    *   **"Manuel Düzeltme"**: Gelişmiş editör ile tüm alanları manuel düzelterek yayınlayın.
    *   **"Tekrar Dene"**: Kampanyayı AI'ya geri gönderir.

### 3. Cron Job

**Script:** `scripts/cron_process_pending.ts`

**Runs:** Every X minutes (configured in deployment)

**Logic:**
1. Fetch campaigns with `publish_status='processing'` or `ai_status='pending'`
2. Run AI fix for each campaign (limit 25 per batch)
3. Apply patches for high-confidence fixes
4. Update publish status

**Manual Execution:**
```bash
cd kartavantaj-scraper
npx tsx scripts/cron_process_pending.ts
```

### 4. Cron Endpoint

**URL:** `GET /api/cron/process-pending?secret=CRON_SECRET`

**Environment Variable:**
```bash
CRON_SECRET=your-secret-here
```

**Vercel Cron Configuration:**

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/process-pending?secret=YOUR_SECRET",
    "schedule": "*/5 * * * *"
  }]
}
```

**Security:**
- Endpoint requires `CRON_SECRET` query parameter
- Returns 401 if secret is invalid
- Returns 500 if `CRON_SECRET` env var not set

### 5. Frontend Service

**Location:** `src/services/qualityAuditService.ts`

**Functions:**
- `runAiFix()`: Batch process campaigns
- `getQueue()`: List campaigns by status
- `getCampaignDetail()`: Get campaign + audit + AI info
- `performAction()`: Approve/reject/override

## Usage

### For Developers

**1. Apply Migrations:**
```bash
# In Supabase SQL Editor:
# 1. migrations/add_ai_autofix_columns.sql
# 2. migrations/add_publish_gating.sql
```

**2. Set Environment Variables:**
```bash
# kartavantaj-scraper/.env
GOOGLE_GEMINI_KEY=your-key
SUPABASE_URL=your-url
SUPABASE_ANON_KEY=your-key

# kartavantaj/.env (Vercel)
CRON_SECRET=your-secret
```

**3. Run Scraper:**
```bash
cd kartavantaj-scraper
npm run scrape:akbank  # or any scraper
```

Campaigns are automatically set to `publish_status='processing'`.

**4. Run Cron Job:**
```bash
# Manual execution
npx tsx scripts/cron_process_pending.ts

# Or wait for Vercel Cron (every 5 minutes)
```

**5. Check Results:**
```sql
-- View publish status distribution
SELECT publish_status, COUNT(*) 
FROM campaigns 
GROUP BY publish_status;

-- View AI fix results
SELECT ai_status, COUNT(*) 
FROM campaign_quality_audits 
GROUP BY ai_status;

-- View campaigns needing review
SELECT c.title, a.ai_confidence, a.issues
FROM campaigns c
JOIN campaign_quality_audits a ON a.campaign_id = c.id
WHERE a.ai_status = 'needs_review';
```

### For Admins (Future Phase 2)

Admin panel at `/panel/quality-audit` will provide:
- Queue management (needs review, failed, auto-applied)
- Campaign detail with AI patch diff
- Approve/reject/override actions

## Testing

**Test AI Fix:**
```bash
cd kartavantaj-scraper
npx tsx scripts/test_ai_autofix.ts
```

**Expected Results:**
- 80% auto-apply rate
- 100% cache hit rate
- Zero data consistency issues

**Verify Public Site:**
```sql
-- Public site should only show these:
SELECT * FROM campaigns WHERE publish_status = 'clean';
```

## Troubleshooting

**Issue:** Campaigns stuck in 'processing'

**Solution:**
1. Check cron job logs
2. Run manual cron: `npx tsx scripts/cron_process_pending.ts`
3. Check audit errors: `SELECT * FROM campaign_quality_audits WHERE ai_status = 'failed'`

**Issue:** Low auto-apply rate

**Solution:**
1. Review AI confidence scores
2. Check issue types: `SELECT issues, COUNT(*) FROM campaign_quality_audits GROUP BY issues`
3. Adjust confidence thresholds if needed

**Issue:** Cron endpoint not working

**Solution:**
1. Verify `CRON_SECRET` is set in Vercel
2. Check Vercel function logs
3. Test endpoint manually: `curl "https://your-domain.com/api/cron/process-pending?secret=YOUR_SECRET"`

## Metrics

**Current Performance (Phase 1 Test):**
- Campaigns tested: 10
- Auto-apply rate: 80%
- Needs review: 20%
- Failed: 0%
- Cache hit rate: 100%
- Processing time: ~178ms (cached)

## Future Enhancements (Phase 2)

- Admin UI for manual review queue
- Batch approve/reject actions
- Rollback mechanism for auto-applied patches
- Analytics dashboard
- Email notifications for failed campaigns
