# Maximum Scraper - Çözüm Özeti

## Sorun
- Axios + Cheerio ile görseller çekilemiyor
- `og:image` = favicon (gerçek görsel değil)
- Gerçek görsel JavaScript ile yükleniyor

## Test Sonucu
```bash
curl -s "URL" | grep "og:image"
# Sonuç: favicon.ico (❌)
```

## Çözümler

### 1. ✅ Puppeteer (Önerilen - Gemini)
```typescript
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle2' });

const image = await page.evaluate(() => {
    // JS render olduktan SONRA çek
    const img = document.querySelector('.campaign-detail img');
    return img?.src || null;
});
```

**Artılar:**
- ✅ JS render'ı bekler
- ✅ Lazy-load görselleri görür
- ✅ %100 doğru veri

**Eksiler:**
- ❌ Yavaş (her sayfa için tarayıcı açar)
- ❌ Kaynak tüketimi fazla

### 2. ⚠️ Axios + Robust Selector (ChatGPT)
```typescript
const img = $('img').toArray()
    .map(el => $(el).attr('src') || $(el).attr('data-src'))
    .find(u => u?.includes('/PublishingImages/'));
```

**Artılar:**
- ✅ Hızlı
- ✅ Hafif

**Eksiler:**
- ❌ JS render'ı göremez
- ❌ Maximum'da çalışmıyor (test ettik)

### 3. 🚀 Mevcut Python Scraper (En İyi)
Eski scraper'ınız zaten çalışıyor:
- `/Users/hipoglisemi/Desktop/final/İŞ BANKASI/maximum.py`
- Selenium + undetected-chromedriver kullanıyor
- Bot korumasını aşıyor

## Karar
**GitHub Actions'ta V5 workflow'unu kullan:**
1. Python scraper (Selenium) → Tam veri çeker
2. TypeScript → AI ile işler, Supabase'e kaydeder

## Neden Local'de Çalışmıyor?
- MacOS + Chrome 143 + undetected-chromedriver uyumsuz
- GitHub Actions (Linux) sorunsuz çalışır

## Sonraki Adım
```bash
# GitHub Actions → Maximum V5 workflow'unu çalıştır
```
