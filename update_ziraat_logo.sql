-- Ziraat Bankası Logo Güncelleme
-- 'ziraat' ID'li bankanın logosunu güncelliyoruz.
UPDATE public.bank_configs
SET 
  logo = 'https://upload.wikimedia.org/wikipedia/tr/thumb/a/a5/Ziraat_Bankas%C4%B1_logo.png/600px-Ziraat_Bankas%C4%B1_logo.png',
  updated_at = NOW()
WHERE bank_id = 'ziraat';

-- Eğer 'ziraat' yoksa, kartlar ile birlikte ekleyelim (Güvenlik Önlemi)
INSERT INTO public.bank_configs (bank_id, bank_name, logo, cards)
VALUES (
  'ziraat',
  'Ziraat Bankası',
  'https://upload.wikimedia.org/wikipedia/tr/thumb/a/a5/Ziraat_Bankas%C4%B1_logo.png/600px-Ziraat_Bankas%C4%B1_logo.png',
  '[{"id": "bankkart", "name": "Bankkart"}]'::jsonb
)
ON CONFLICT (bank_id) DO UPDATE
SET logo = EXCLUDED.logo,
    updated_at = NOW();
