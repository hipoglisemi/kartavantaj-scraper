-- Step 0: Create sectors table first (if not exists)
-- This must run BEFORE other migrations

CREATE TABLE IF NOT EXISTS sectors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Populate with 17 sectors
INSERT INTO sectors (name, slug, description) VALUES
    ('Market & Gıda', 'market-gida', 'Süpermarketler, marketler, gıda alışverişi'),
    ('Akaryakıt', 'akaryakit', 'Benzin, motorin, LPG istasyonları'),
    ('Giyim & Aksesuar', 'giyim-aksesuar', 'Kıyafet, ayakkabı, çanta, aksesuar'),
    ('Restoran & Kafe', 'restoran-kafe', 'Yemek siparişi, kafe, restoran'),
    ('Elektronik', 'elektronik', 'Telefon, bilgisayar, beyaz eşya'),
    ('Mobilya & Dekorasyon', 'mobilya-dekorasyon', 'Ev mobilyası, dekorasyon, ev tekstili'),
    ('Kozmetik & Sağlık', 'kozmetik-saglik', 'Kozmetik, kişisel bakım, sağlık'),
    ('E-Ticaret', 'e-ticaret', 'Online alışveriş platformları'),
    ('Ulaşım', 'ulasim', 'Havayolu, taksi, araç kiralama'),
    ('Dijital Platform', 'dijital-platform', 'Dijital içerik, oyun, streaming'),
    ('Kültür & Sanat', 'kultur-sanat', 'Sinema, tiyatro, konser, etkinlik'),
    ('Eğitim', 'egitim', 'Okul, kurs, eğitim hizmetleri'),
    ('Sigorta', 'sigorta', 'Sigorta poliçeleri'),
    ('Otomotiv', 'otomotiv', 'Araç bakım, servis, yedek parça'),
    ('Vergi & Kamu', 'vergi-kamu', 'Vergi, belediye, kamu ödemeleri'),
    ('Turizm & Konaklama', 'turizm-konaklama', 'Otel, tatil, seyahat'),
    ('Diğer', 'diger', 'Diğer kategoriler')
ON CONFLICT (slug) DO NOTHING;

-- Verify
SELECT id, name, slug FROM sectors ORDER BY name;
