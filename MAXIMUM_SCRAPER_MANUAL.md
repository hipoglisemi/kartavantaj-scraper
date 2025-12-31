# Maximum Scraper - Manuel Kullanım Kılavuzu

## ⚠️ Önemli: Bot Koruması

İş Bankası Maximum sitesi bot koruması kullanıyor. Bu yüzden scraper'ı çalıştırmadan önce Chrome'u debug modda başlatmanız gerekiyor.

## 📋 Adım Adım Kullanım

### 1. Chrome'u Debug Modda Başlat

**Terminal 1'de çalıştır:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome_dev_test"
```

**Ne yapar:**
- Chrome'u debug modda açar
- Port 9222'de remote debugging aktif olur
- Scraper bu Chrome instance'ını kullanır
- Bot korumasını aşar

**Not:** Bu terminal açık kalmalı, kapatmayın!

### 2. Scraper'ı Çalıştır

**Terminal 2'de çalıştır:**
```bash
cd "/Users/hipoglisemi/Desktop/final/İŞ BANKASI"
python3 maximum.py
```

**Çıktı:**
- `maximum_kampanyalar_hibrit.json` oluşturulur
- Tüm kampanyalar (limit: 1000)
- Görseller, finansal veriler, kartlar dahil

### 3. Import Et (AI ile)

**Terminal 3'te çalıştır:**
```bash
cd /Users/hipoglisemi/Desktop/kartavantaj-scraper
npx tsx import_maximum_pc.ts
```

**Ne yapar:**
- JSON'u okur
- Her kampanyayı AI ile işler
- Marketing text oluşturur
- Supabase'e kaydeder

## 🔧 Scraper Ayarları

### Limit
```python
CAMPAIGN_LIMIT = 1000  # Maksimum kampanya sayısı
```

### Filtreler
- ✅ Süresi bitmiş kampanyalar otomatik atlanır
- ✅ "Geçmiş" kelimesi içeren kampanyalar atlanır
- ✅ Başlığı 10 karakterden kısa olanlar atlanır

## 🎯 Beklenen Sonuç

### Başarılı Çalıştırma
```
🚀 Maximum Kart - HIBRIT MOD (Görsel v7 + Logic v8)...
   -> Liste yükleniyor...
      Tüm liste yüklendi.
   -> Toplam 237 kampanya bulundu. İşleniyor...
      [1] Porland'da 300 TL MaxiPuan... (M:3000 E:300 TL MaxiPuan Img:✅)
      [2] Marks & Spencer... (M:8000 E:800 TL MaxiPuan Img:✅)
      ...
✅ İŞLEM TAMAMLANDI! 150 kampanya kaydedildi.
```

### Veri Kalitesi
- **Görseller:** ~93% (bazı kampanyalarda olmayabilir)
- **Finansal Veriler:** ~60% (taksit kampanyalarında olmaz)
- **Kartlar:** 100%
- **Tarihler:** ~80%

## ❌ Sorun Giderme

### "ERR_CONNECTION_RESET" Hatası
**Neden:** Chrome debug modda değil
**Çözüm:** Adım 1'i tekrar yap

### "No such window" Hatası
**Neden:** Chrome kapandı
**Çözüm:** Chrome debug modda yeniden başlat

### Kampanya Sayısı Az
**Neden:** Bot koruması bazı kampanyaları engelliyor
**Çözüm:** Normal, ~60-70% başarı oranı beklenir

## 🚀 GitHub Actions (Gelecek)

Otomatik çalıştırma için GitHub Actions'a eklenecek:
- Günlük otomatik çalışma
- Debug mode gerektirmez (Linux'ta)
- Tam otomatik import

## 📝 Notlar

- **MacOS'ta:** Debug mode şart
- **Linux'ta (GitHub Actions):** Debug mode gerekmez
- **Windows'ta:** Test edilmedi

## 🔗 İlgili Dosyalar

- Scraper: `/Users/hipoglisemi/Desktop/final/İŞ BANKASI/maximum.py`
- Import Script: `/Users/hipoglisemi/Desktop/kartavantaj-scraper/import_maximum_pc.ts`
- Output: `maximum_kampanyalar_hibrit.json`
