# Test Mode Scraper Kullanım Kılavuzu

## 🎯 Amaç
Scraper'ları production veritabanına dokunmadan test etmek için kullanılır.

## 📋 Kurulum

### 1. Supabase'de Test Tablosu Oluştur
```bash
# Supabase Dashboard > SQL Editor'de şu dosyayı çalıştır:
supabase/create_test_campaigns_table.sql
```

### 2. Environment Variable Ekle
`.env.local` dosyasına ekle:
```bash
TEST_MODE=true
```

### 3. Scraper'ı Test Modunda Çalıştır
```bash
# Yöntem 1: Environment variable ile
TEST_MODE=true npm run scrape:maximum -- --limit=5

# Yöntem 2: Command line flag ile
npm run scrape:maximum -- --test --limit=5
```

## 🔧 Scraper'lara Test Modu Ekleme

Her scraper dosyasında şu değişiklikleri yap:

### 1. Import Ekle
```typescript
import { getTargetTable, logTestModeStatus, logTestModeSummary } from '../../utils/testMode';
```

### 2. Başlangıçta Log
```typescript
async function runMaximumScraper() {
    logTestModeStatus(); // Test modu aktifse uyarı göster
    
    const tableName = getTargetTable(); // 'test_campaigns' veya 'campaigns'
    // ... scraper kodu
}
```

### 3. Veritabanı İşlemlerinde Kullan
```typescript
// ÖNCE (eski):
const { data: existing } = await supabase
    .from('campaigns')  // ❌ Sabit tablo adı
    .select('id')
    .eq('reference_url', url)
    .single();

// SONRA (yeni):
const tableName = getTargetTable();
const { data: existing } = await supabase
    .from(tableName)  // ✅ Dinamik tablo adı
    .select('id')
    .eq('reference_url', url)
    .single();
```

### 4. Sonuçta Özet Göster
```typescript
console.log(`\n✅ Maximum Scraper Finished. Processed ${count} campaigns.`);
logTestModeSummary(count, tableName); // Test modu özetini göster
```

## 📊 Admin Panel Entegrasyonu

### Test Scraper Menüsü
Admin panelde yeni menü öğesi eklenecek:
- **Görünürlük:** Sadece admin kullanıcılar
- **Özellikler:**
  - Test kampanyalarını listele
  - Kolonları görüntüle
  - Tüm test verilerini temizle
  - Scraper loglarını göster

### Sayfa Yapısı
```
/admin/test-scraper
├── Test Campaigns List (tablo görünümü)
├── Column Inspector (kolon detayları)
└── Actions (temizle, export vb.)
```

## 🧪 Test Workflow

1. **Test Modunu Aç:** `TEST_MODE=true`
2. **Scraper'ı Çalıştır:** `npm run scrape:maximum -- --limit=3`
3. **Admin Panel'de Kontrol Et:** `/admin/test-scraper`
4. **Kolonları İncele:** Tüm alanların doğru doldurulduğunu kontrol et
5. **Temizle:** Test verilerini sil
6. **Production'a Geç:** `TEST_MODE=false` (veya kaldır)

## ⚠️ Önemli Notlar

- Test modu aktifken **hiçbir veri production'a yazılmaz**
- Test tablosu **ana sitede görünmez**
- RLS politikaları sayesinde **sadece admin'ler erişebilir**
- Test verileri **istediğin zaman silinebilir**

## 🚀 Örnek Kullanım

```bash
# 1. Test tablosunu oluştur (bir kez)
# Supabase SQL Editor'de create_test_campaigns_table.sql çalıştır

# 2. Maximum scraper'ı test et
TEST_MODE=true npm run scrape:maximum -- --limit=5

# 3. Admin panelde kontrol et
# http://localhost:3000/admin/test-scraper

# 4. Test verilerini temizle
# Admin panel > Test Scraper > Clear All

# 5. Production'da çalıştır
npm run scrape:maximum -- --limit=100
```

## 📝 Checklist

- [ ] `test_campaigns` tablosu oluşturuldu
- [ ] `testMode.ts` utility eklendi
- [ ] Scraper'a test modu entegre edildi
- [ ] Admin panel test sayfası oluşturuldu
- [ ] Test workflow doğrulandı
- [ ] Production'da test edildi
