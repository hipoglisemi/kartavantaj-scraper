-- 1. Add aliases column to bank_configs
ALTER TABLE public.bank_configs ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';

-- 2. Migrate aliases from master_banks to bank_configs
-- bank_configs.bank_id matches master_banks.slug usually, but let's match by name or slug
UPDATE public.bank_configs bc
SET aliases = mb.aliases
FROM public.master_banks mb
WHERE bc.bank_id = mb.slug 
   OR bc.bank_name = mb.name;

-- 3. Add some default aliases for known banks if missing
UPDATE public.bank_configs SET aliases = ARRAY['Ziraat', 'Ziraat Bankasi', 'Ziraat Bankası'] WHERE bank_id = 'ziraat';
UPDATE public.bank_configs SET aliases = ARRAY['Garanti', 'Garanti BBVA', 'BBVA'] WHERE bank_id = 'garanti';
UPDATE public.bank_configs SET aliases = ARRAY['Akbank'] WHERE bank_id = 'akbank';
UPDATE public.bank_configs SET aliases = ARRAY['Yapı Kredi', 'Yapi Kredi', 'YKB'] WHERE bank_id = 'yapikredi' OR bank_id = 'yapi-kredi';
UPDATE public.bank_configs SET aliases = ARRAY['İş Bankası', 'Is Bankasi', 'Isbank'] WHERE bank_id = 'isbank' OR bank_id = 'is-bankasi';
UPDATE public.bank_configs SET aliases = ARRAY['Halkbank', 'Halk Bankası'] WHERE bank_id = 'halkbank';
UPDATE public.bank_configs SET aliases = ARRAY['Vakıfbank', 'VakıfBank'] WHERE bank_id = 'vakifbank';
