-- დამატება მთავარი schema.sql-ის შემდეგ — is_admin()-ს ვამკაცრებთ (search_path) და
-- ვამატებთ am_i_admin() RPC-ს, რომელსაც admin.js login-ის შემდეგ პირდაპირ ეძახის.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

create or replace function public.am_i_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.is_admin();
$$;
grant execute on function public.am_i_admin() to anon, authenticated;
