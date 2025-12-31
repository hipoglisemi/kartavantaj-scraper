# Maximum Tam Import Planı

## Adım 1: PC'de Scraper Çalıştır

```bash
cd "/Users/hipoglisemi/Desktop/final/İŞ BANKASI"
python3 maximum.py
```

Bu komut:
- Tüm Maximum kampanyalarını çeker
- `maximum_kampanyalar_hibrit.json` oluşturur
- Görseller, finansal veriler, kartlar - hepsi dahil

## Adım 2: Mevcut Kampanyaları Temizle (Opsiyonel)

Eğer eski/hatalı kampanyaları silmek isterseniz:

```sql
DELETE FROM campaigns 
WHERE bank = 'İş Bankası' 
AND card_name = 'Maximum';
```

## Adım 3: Import Et

```bash
cd /Users/hipoglisemi/Desktop/kartavantaj-scraper
npx tsx import_maximum_pc.ts "/Users/hipoglisemi/Desktop/final/İŞ BANKASI/maximum_kampanyalar_hibrit.json"
```

Bu:
- JSON'u okur
- Her kampanyayı AI ile işler
- Supabase'e kaydeder
- ~2-3 dakika sürer (kampanya sayısına göre)

## Sonuç

✅ Tüm kampanyalar:
- Görselli
- Finansal veriler tam
- AI ile zenginleştirilmiş
- Marketing text otomatik

## Gelecek: GitHub Actions

Daha sonra eski scraper'ı GitHub Actions'a ekleyebiliriz:
1. Python scraper → JSON
2. TypeScript import → Supabase
3. Otomatik, günlük çalışır
