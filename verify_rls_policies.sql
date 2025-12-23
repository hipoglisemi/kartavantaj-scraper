-- ============================================
-- RLS POLİTİKALARI KONTROL SORGUSU
-- ============================================

-- Tüm politikaları listele
SELECT 
    tablename as "Tablo",
    policyname as "Politika Adı",
    CASE cmd
        WHEN 'r' THEN 'SELECT (Okuma)'
        WHEN 'a' THEN 'INSERT (Ekleme)'
        WHEN 'w' THEN 'UPDATE (Güncelleme)'
        WHEN 'd' THEN 'DELETE (Silme)'
        WHEN '*' THEN 'ALL (Tümü)'
        ELSE cmd
    END as "Komut",
    CASE 
        WHEN qual LIKE '%true%' THEN '✅ Public (Herkes)'
        WHEN qual LIKE '%authenticated%' THEN '🔒 Authenticated (Sadece giriş yapanlar)'
        ELSE '⚠️ Diğer'
    END as "Erişim"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('campaigns', 'master_banks', 'master_sectors', 'master_brands', 'master_categories')
ORDER BY tablename, policyname;

-- ============================================
-- BEKLENEN SONUÇ:
-- ============================================
-- campaigns:
--   - Public Read (SELECT) ✅
--   - Authenticated can write campaigns (ALL) 🔒
--
-- master_banks:
--   - Public read banks (SELECT) ✅
--   - Authenticated write banks (ALL) 🔒
--
-- master_sectors:
--   - Public read sectors (SELECT) ✅
--   - Authenticated write sectors (ALL) 🔒
--
-- master_brands:
--   - Brands are viewable by everyone (SELECT) ✅
--   - Authenticated can manage brands (ALL) 🔒
--
-- master_categories:
--   - Categories are viewable by everyone (SELECT) ✅
--   - Authenticated can manage categories (ALL) 🔒
