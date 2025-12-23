-- Check if the user exists in auth.users and admin_users
select 
  au.email as auth_email,
  au.created_at as auth_created_at,
  au.email_confirmed_at,
  adm.email as admin_email,
  adm.status as admin_status,
  adm.created_at as admin_created_at
from auth.users au
left join public.admin_users adm on au.email = adm.email
where au.email = 'admin@kartavantaj.com';
