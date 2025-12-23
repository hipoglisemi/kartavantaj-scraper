-- ============================================
-- SUPABASE RLS GÜVENLİK POLİTİKALARI
-- Repo'yu public yapmadan önce çalıştırın!
-- ============================================

-- ============================================
-- 1. CAMPAIGNS TABLOSU (En Kritik)
-- ============================================
-- Mevcut public write politikalarını sil
DROP POLICY IF EXISTS "Public Delete" ON campaigns;
DROP POLICY IF EXISTS "Public Insert" ON campaigns;
DROP POLICY IF EXISTS "Public Update" ON campaigns;

-- Sadece authenticated kullanıcılar yazabilir
CREATE POLICY "Authenticated can write campaigns" ON campaigns
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Public Read zaten var, dokunmuyoruz

-- ============================================
-- 2. MASTER_BANKS TABLOSU
-- ============================================
-- RLS'yi aç
ALTER TABLE master_banks ENABLE ROW LEVEL SECURITY;

-- Public okuma
CREATE POLICY "Public read banks" ON master_banks
FOR SELECT USING (true);

-- Authenticated yazma
CREATE POLICY "Authenticated write banks" ON master_banks
FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 3. MASTER_SECTORS TABLOSU
-- ============================================
-- Mevcut public write politikalarını sil
DROP POLICY IF EXISTS "Enable delete for all users" ON master_sectors;
DROP POLICY IF EXISTS "Enable insert for all users" ON master_sectors;
DROP POLICY IF EXISTS "Enable update for all users" ON master_sectors;
DROP POLICY IF EXISTS "Public All Access" ON master_sectors;

-- Public okuma
CREATE POLICY "Public read sectors" ON master_sectors
FOR SELECT USING (true);

-- Authenticated yazma
CREATE POLICY "Authenticated write sectors" ON master_sectors
FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- DOĞRULAMA SORGUSU
-- ============================================
-- Bu sorguyu çalıştırarak politikaları kontrol edin:
/*
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('campaigns', 'master_banks', 'master_sectors')
ORDER BY tablename, policyname;
*/

-- ============================================
-- SONUÇ
-- ============================================
-- ✅ Herkes okuyabilir (SELECT)
-- ✅ Sadece authenticated kullanıcılar yazabilir (INSERT/UPDATE/DELETE)
-- ✅ Scraper GitHub Actions'dan authenticated olarak çalışır
-- ✅ Repo public yapılabilir, tamamen güvenli!
