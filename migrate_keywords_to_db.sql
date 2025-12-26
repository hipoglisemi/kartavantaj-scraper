-- Phase 3: Dynamic Sectors - Migrate hardcoded keywords to database
-- This enables admin panel keyword management without deploy

-- 1. Populate sector_keywords from hardcoded SECTORS
-- Note: Assumes sectors table is already populated with correct IDs

-- Market & Gıda
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'market-gida' LIMIT 1), 'migros', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'market-gida' LIMIT 1), 'carrefoursa', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'market-gida' LIMIT 1), 'şok market', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'market-gida' LIMIT 1), 'a101', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'market-gida' LIMIT 1), 'bim', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'market-gida' LIMIT 1), 'getir', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'market-gida' LIMIT 1), 'yemeksepeti market', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'market-gida' LIMIT 1), 'kasap', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'market-gida' LIMIT 1), 'şarküteri', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'market-gida' LIMIT 1), 'fırın', 1, true);

-- Akaryakıt
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'akaryakit' LIMIT 1), 'shell', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'akaryakit' LIMIT 1), 'opet', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'akaryakit' LIMIT 1), 'bp', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'akaryakit' LIMIT 1), 'petrol ofisi', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'akaryakit' LIMIT 1), 'totalenergies', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'akaryakit' LIMIT 1), 'akaryakıt', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'akaryakit' LIMIT 1), 'benzin', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'akaryakit' LIMIT 1), 'motorin', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'akaryakit' LIMIT 1), 'lpg', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'akaryakit' LIMIT 1), 'istasyon', 1, true);

-- Giyim & Aksesuar
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'boyner', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'zara', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'h&m', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'mango', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'lcw', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'koton', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'giyim', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'ayakkabı', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'çanta', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'moda', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'aksesuar', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'takı', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'giyim-aksesuar' LIMIT 1), 'saat', 1, true);

-- Restoran & Kafe
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'restoran-kafe' LIMIT 1), 'restoran', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'restoran-kafe' LIMIT 1), 'yemeksepeti', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'restoran-kafe' LIMIT 1), 'getir yemek', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'restoran-kafe' LIMIT 1), 'starbucks', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'restoran-kafe' LIMIT 1), 'kahve', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'restoran-kafe' LIMIT 1), 'cafe', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'restoran-kafe' LIMIT 1), 'kafe', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'restoran-kafe' LIMIT 1), 'burger king', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'restoran-kafe' LIMIT 1), 'mcdonalds', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'restoran-kafe' LIMIT 1), 'fast food', 1, true);

-- Elektronik
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'teknosa', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'vatan bilgisayar', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'media markt', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'apple', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'samsung', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'elektronik', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'beyaz eşya', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'telefon', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'bilgisayar', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'tablet', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'laptop', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'televizyon', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'elektronik' LIMIT 1), 'klima', 1, true);

-- Mobilya & Dekorasyon
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'mobilya-dekorasyon' LIMIT 1), 'ikea', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'mobilya-dekorasyon' LIMIT 1), 'koçtaş', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'mobilya-dekorasyon' LIMIT 1), 'bauhaus', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'mobilya-dekorasyon' LIMIT 1), 'mobilya', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'mobilya-dekorasyon' LIMIT 1), 'dekorasyon', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'mobilya-dekorasyon' LIMIT 1), 'ev tekstili', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'mobilya-dekorasyon' LIMIT 1), 'yatak', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'mobilya-dekorasyon' LIMIT 1), 'mutfak', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'mobilya-dekorasyon' LIMIT 1), 'halı', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'mobilya-dekorasyon' LIMIT 1), 'iklimlendirme', 1, true);

-- Kozmetik & Sağlık
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1), 'gratis', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1), 'watsons', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1), 'rossmann', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1), 'sephora', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1), 'kozmetik', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1), 'kişisel bakım', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1), 'eczane', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1), 'sağlık', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1), 'hastane', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1), 'doktor', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kozmetik-saglik' LIMIT 1), 'parfüm', 1, true);

-- E-Ticaret
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'e-ticaret' LIMIT 1), 'trendyol', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'e-ticaret' LIMIT 1), 'hepsiburada', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'e-ticaret' LIMIT 1), 'amazon', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'e-ticaret' LIMIT 1), 'n11', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'e-ticaret' LIMIT 1), 'pazarama', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'e-ticaret' LIMIT 1), 'çiçeksepeti', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'e-ticaret' LIMIT 1), 'e-ticaret', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'e-ticaret' LIMIT 1), 'online alışveriş', 1, true);

-- Ulaşım
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1), 'thy', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1), 'pegasus', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1), 'türk hava yolları', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1), 'havayolu', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1), 'otobüs', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1), 'ulaşım', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1), 'araç kiralama', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1), 'rent a car', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1), 'martı', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1), 'bitaksi', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'ulasim' LIMIT 1), 'uber', 2, true);

-- Dijital Platform
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'dijital-platform' LIMIT 1), 'netflix', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'dijital-platform' LIMIT 1), 'spotify', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'dijital-platform' LIMIT 1), 'youtube premium', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'dijital-platform' LIMIT 1), 'exxen', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'dijital-platform' LIMIT 1), 'disney+', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'dijital-platform' LIMIT 1), 'steam', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'dijital-platform' LIMIT 1), 'playstation', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'dijital-platform' LIMIT 1), 'xbox', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'dijital-platform' LIMIT 1), 'dijital platform', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'dijital-platform' LIMIT 1), 'oyun', 1, true);

-- Kültür & Sanat
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'kultur-sanat' LIMIT 1), 'sinema', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kultur-sanat' LIMIT 1), 'tiyatro', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kultur-sanat' LIMIT 1), 'konser', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kultur-sanat' LIMIT 1), 'biletix', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'kultur-sanat' LIMIT 1), 'itunes', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'kultur-sanat' LIMIT 1), 'kitap', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kultur-sanat' LIMIT 1), 'etkinlik', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kultur-sanat' LIMIT 1), 'müze', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'kultur-sanat' LIMIT 1), 'sanat', 1, true);

-- Eğitim
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'egitim' LIMIT 1), 'okul', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'egitim' LIMIT 1), 'üniversite', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'egitim' LIMIT 1), 'kırtasiye', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'egitim' LIMIT 1), 'kurs', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'egitim' LIMIT 1), 'eğitim', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'egitim' LIMIT 1), 'öğrenim', 1, true);

-- Sigorta
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'sigorta' LIMIT 1), 'sigorta', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'sigorta' LIMIT 1), 'kasko', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'sigorta' LIMIT 1), 'poliçe', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'sigorta' LIMIT 1), 'emeklilik', 1, true);

-- Otomotiv
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'otomotiv' LIMIT 1), 'otomotiv', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'otomotiv' LIMIT 1), 'servis', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'otomotiv' LIMIT 1), 'bakım', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'otomotiv' LIMIT 1), 'yedek parça', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'otomotiv' LIMIT 1), 'lastik', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'otomotiv' LIMIT 1), 'oto', 1, true);

-- Vergi & Kamu
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'vergi-kamu' LIMIT 1), 'vergi', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'vergi-kamu' LIMIT 1), 'mtv', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'vergi-kamu' LIMIT 1), 'belediye', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'vergi-kamu' LIMIT 1), 'e-devlet', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'vergi-kamu' LIMIT 1), 'kamu', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'vergi-kamu' LIMIT 1), 'fatura', 1, true);

-- Turizm & Konaklama
INSERT INTO sector_keywords (sector_id, keyword, weight, is_active) VALUES
  ((SELECT id FROM sectors WHERE slug = 'turizm-konaklama' LIMIT 1), 'otel', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'turizm-konaklama' LIMIT 1), 'tatil', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'turizm-konaklama' LIMIT 1), 'konaklama', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'turizm-konaklama' LIMIT 1), 'turizm', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'turizm-konaklama' LIMIT 1), 'acente', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'turizm-konaklama' LIMIT 1), 'jolly tur', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'turizm-konaklama' LIMIT 1), 'etstur', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'turizm-konaklama' LIMIT 1), 'setur', 2, true),
  ((SELECT id FROM sectors WHERE slug = 'turizm-konaklama' LIMIT 1), 'yurt dışı', 1, true),
  ((SELECT id FROM sectors WHERE slug = 'turizm-konaklama' LIMIT 1), 'seyahat', 1, true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sector_keywords_sector ON sector_keywords(sector_id);
CREATE INDEX IF NOT EXISTS idx_sector_keywords_active ON sector_keywords(is_active) WHERE is_active = true;

-- Query to verify migration
SELECT 
    s.name as sector_name,
    COUNT(sk.id) as keyword_count,
    STRING_AGG(sk.keyword, ', ' ORDER BY sk.weight DESC, sk.keyword) as keywords
FROM sectors s
LEFT JOIN sector_keywords sk ON s.id = sk.sector_id AND sk.is_active = true
GROUP BY s.id, s.name
ORDER BY s.name;
