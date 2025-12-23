-- 🛡️ MASTER ADMIN KURULUM SCRIPTI
-- Bu scripti Supabase SQL Editor'de çalıştırın.

-- 1. E-posta onayını zorla geç (Supabase Auth)
-- Email confirmation required ise login olamayacağınız için manuel onaylıyoruz.
update auth.users
set email_confirmed_at = now(),
    updated_at = now()
where email = 'admin@kartavantaj.com';

-- 2. Master Admin yetkisini ver (Admin Users)
-- Eğer kayıt sırasında 'pending' kaldıysa veya henüz yoksa düzeltiyoruz.
insert into public.admin_users (email, name, status, password_hash)
values (
    'admin@kartavantaj.com', 
    'Master Admin', 
    'active', 
    'managed_by_supabase'
)
on conflict (email) do update
set status = 'active',
    updated_at = now();

-- Sonuçları kontrol et
select id, email, confirmed_at from auth.users where email = 'admin@kartavantaj.com';
select email, status from public.admin_users where email = 'admin@kartavantaj.com';
