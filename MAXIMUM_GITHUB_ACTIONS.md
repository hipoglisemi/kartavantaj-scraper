# Maximum GitHub Actions Workflow

## ✅ Kurulum Tamamlandı!

### Silinen Eski Workflow'lar
- ❌ `maximum-v3.yml` (Puppeteer - çalışmıyordu)
- ❌ `maximum-v4.yml` (Axios+Cheerio - JS render edemiyordu)
- ❌ `maximum-v5.yml` (Python ama hatalı)

### Yeni Production Workflow
✅ `.github/workflows/maximum.yml`

## 📋 Workflow Özellikleri

### Otomatik Çalışma
```yaml
schedule:
  - cron: '0 3 * * *'  # Her gün 06:00 TR
```

### Manuel Çalıştırma
GitHub → Actions → "🎯 Maximum (Production)" → Run workflow
- Limit ayarlanabilir (default: 1000)

### Adımlar
1. **Python Setup** → Python 3.11
2. **Node Setup** → Node 20
3. **Dependencies** → pip install + npm install
4. **Scraper** → Python scraper çalışır (xvfb ile headless)
5. **Import** → TypeScript AI import (Gemini)
6. **Upload** → JSON artifact olarak saklanır

## 🔧 Gereksinimler

### Python Packages (`requirements.txt`)
```
undetected-chromedriver
selenium
beautifulsoup4
lxml
```

### GitHub Secrets
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_GEMINI_KEY`

## 🎯 Beklenen Sonuç

### Başarılı Çalıştırma
- ✅ ~150-200 kampanya çekilir
- ✅ AI ile işlenir
- ✅ Supabase'e kaydedilir
- ✅ JSON artifact yüklenir

### Süre
- Scraping: ~15-20 dakika
- AI Import: ~10-15 dakika
- **Toplam:** ~30-35 dakika

## 📊 Veri Kalitesi

| Alan | Beklenen |
|------|----------|
| Görseller | ~93% |
| Finansal Veriler | ~60% |
| Kartlar | 100% |
| Tarihler | ~80% |
| Marketing Text | 100% (AI) |

## 🚀 İlk Çalıştırma

### Manuel Test
1. GitHub → Actions
2. "🎯 Maximum (Production)" seç
3. "Run workflow" tıkla
4. Limit: 10 (test için)
5. "Run workflow" onayla

### Logları İzle
- Scraper çıktısı
- AI işleme durumu
- Supabase kayıt sayısı

### Başarı Kontrolü
- Admin Panel → Kampanyalar
- Filtre: İş Bankası + Maximum
- Kontrol: Görseller, tarihler, marketing text

## ⚠️ Bilinen Sorunlar

### Bot Koruması
- GitHub Actions (Linux) → ✅ Çalışır
- MacOS (local) → ❌ Debug mode gerekir

### Başarı Oranı
- ~60-70% kampanya başarılı
- Bot koruması bazılarını engelleyebilir
- Normal ve beklenen

## 📝 Notlar

- **Timeout:** 120 dakika (2 saat)
- **Artifact:** 90 gün saklanır
- **Retry:** Yok (başarısız olursa manuel tekrar)

## 🔗 İlgili Dosyalar

- Workflow: `.github/workflows/maximum.yml`
- Scraper: `src/scrapers/isbankasi/maximum.py`
- Import: `import_maximum_pc.ts`
- Requirements: `requirements.txt`
