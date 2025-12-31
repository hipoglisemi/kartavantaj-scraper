# Maximum Kampanya Sorunları ve Çözümler

## 1. ✅ Tarih Sorunu

### Sorun
Kampanya bitiş tarihi +1 gün gösteriliyor:
- Gerçek: 31 Aralık 2025
- Gösterilen: 1 Ocak 2026

### Neden
- DB'de: `2025-12-31T23:59:59Z` (UTC)
- Frontend: `toLocaleDateString('tr-TR')` timezone dönüşümü yapıyor
- Türkiye UTC+3 → 31 Aralık 23:59 + 3 saat = 1 Ocak 02:59

### Çözüm
Frontend'de tarih gösteriminde UTC kullan:
```typescript
// Yanlış
new Date(valid_until).toLocaleDateString('tr-TR')

// Doğru
new Date(valid_until).toISOString().split('T')[0]
// veya
new Date(valid_until + 'Z').toLocaleDateString('tr-TR', { timeZone: 'UTC' })
```

## 2. ⚠️ Görsel Yavaş Yükleniyor

### Sorun
Kampanya görselleri geç yükleniyor

### Olası Nedenler
1. Lazy loading çok agresif
2. Maximum.com.tr görselleri yavaş
3. Image preload yok

### Çözüm Önerileri
1. **Eager loading** ilk 10 kampanya için
2. **Image preload** ekle
3. **Placeholder** göster yüklenene kadar

```typescript
<img 
  src={campaign.image} 
  loading={index < 10 ? 'eager' : 'lazy'}
  onLoad={() => setImageLoaded(true)}
/>
```

## Sonraki Adımlar

1. Frontend tarih gösterimini düzelt
2. Image loading optimizasyonu yap
3. Test et
