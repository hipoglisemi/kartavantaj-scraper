-- Happy Card kampanyalarını sil

-- 1. Önce kaç kampanya var kontrol et
SELECT COUNT(*) as total FROM campaigns WHERE card_name = 'Happy Card';

-- 2. Kampanyaları sil
DELETE FROM campaigns WHERE card_name = 'Happy Card';

-- 3. Silme işlemini doğrula
SELECT COUNT(*) as remaining FROM campaigns WHERE card_name = 'Happy Card';
