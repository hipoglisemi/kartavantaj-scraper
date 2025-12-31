# Maximum Scraper Güncellemeleri

## ✅ Yapılan Değişiklikler

### 1. Campaign Limit: 30 → 1000
```python
# Eski
CAMPAIGN_LIMIT = 30

# Yeni
CAMPAIGN_LIMIT = 1000
```

**Neden:** Tüm kampanyaları çekmek için

### 2. Süresi Bitmiş Kampanya Filtresi
```python
# Line 280
if vu and datetime.strptime(vu, "%Y-%m-%dT%H:%M:%SZ") < datetime.now(): 
    continue
```

**Durum:** ✅ Zaten mevcut!
- Kampanya bitiş tarihi geçmişse atlanıyor
- `continue` ile bir sonraki kampanyaya geçiliyor

## 📋 Scraper Akışı

1. **Liste Sayfası** → 237 kampanya bulunuyor
2. **Her Kampanya İçin:**
   - Detay sayfasına git
   - Başlık, görsel, tarih çek
   - ❌ **Geçmiş kampanya?** → Atla
   - ❌ **"Geçmiş" kelimesi var?** → Atla
   - ✅ **Aktif kampanya** → İşle ve kaydet
3. **Limit:** 1000 kampanyaya kadar

## 🎯 Sonuç

Her iki düzeltme de tamamlandı:
- ✅ Limit 1000
- ✅ Süresi bitmiş kampanyalar filtreleniyor

## Sonraki Adım

GitHub Actions'a ekle → Otomatik çalışsın
