-- =========================================================
-- Doll's Coffee — Blog / Contact / About schema
-- გაუშვი schema.sql და admin_rpc.sql-ის შემდეგ (იყენებს მათ
-- set_updated_at()/is_admin() ფუნქციებს - აქაც თავიდანვეა
-- გამეორებული create or replace-ით, უსაფრთხოდ თავიდან გასაშვებად).
-- =========================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

-- =========================================================
-- blog_posts
-- =========================================================
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ka text not null,
  title_en text not null,
  cover_photo_url text,
  body_ka text not null default '',
  body_en text not null default '',
  published_at date not null default current_date,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

drop policy if exists "blog_posts_select" on public.blog_posts;
create policy "blog_posts_select" on public.blog_posts
  for select using (is_published = true or public.is_admin());
drop policy if exists "blog_posts_insert" on public.blog_posts;
create policy "blog_posts_insert" on public.blog_posts
  for insert with check (public.is_admin());
drop policy if exists "blog_posts_update" on public.blog_posts;
create policy "blog_posts_update" on public.blog_posts
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "blog_posts_delete" on public.blog_posts;
create policy "blog_posts_delete" on public.blog_posts
  for delete using (public.is_admin());

-- =========================================================
-- contact_info - singleton row (id is always 1)
-- =========================================================
create table if not exists public.contact_info (
  id integer primary key default 1,
  phone text,
  email text,
  address_ka text,
  address_en text,
  updated_at timestamptz not null default now(),
  constraint contact_info_singleton check (id = 1)
);

drop trigger if exists trg_contact_info_updated_at on public.contact_info;
create trigger trg_contact_info_updated_at before update on public.contact_info
  for each row execute function public.set_updated_at();

alter table public.contact_info enable row level security;

drop policy if exists "contact_info_select" on public.contact_info;
create policy "contact_info_select" on public.contact_info
  for select using (true);
drop policy if exists "contact_info_update" on public.contact_info;
create policy "contact_info_update" on public.contact_info
  for update using (public.is_admin()) with check (public.is_admin());

-- seed: exactly what's live on the site today, so nothing visually
-- changes until the admin edits it from the panel.
insert into public.contact_info (id, phone, email, address_ka, address_en)
values (
  1,
  '+995 599 996 052',
  'info@dollscoffee.com',
  'საქართველო, თბილისი, ვასილ კოპცოვის 34ბ',
  '34b Vasil Koptsovi St, Tbilisi, Georgia'
)
on conflict (id) do nothing;

-- =========================================================
-- contact_messages
-- =========================================================
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- anyone (including anonymous site visitors) can insert a message,
-- but nobody except the admin can ever read/update/delete a row -
-- otherwise any visitor could read everyone else's messages.
drop policy if exists "contact_messages_insert" on public.contact_messages;
create policy "contact_messages_insert" on public.contact_messages
  for insert with check (true);
drop policy if exists "contact_messages_select" on public.contact_messages;
create policy "contact_messages_select" on public.contact_messages
  for select using (public.is_admin());
drop policy if exists "contact_messages_update" on public.contact_messages;
create policy "contact_messages_update" on public.contact_messages
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "contact_messages_delete" on public.contact_messages;
create policy "contact_messages_delete" on public.contact_messages
  for delete using (public.is_admin());

-- =========================================================
-- about_page - singleton row (id is always 1)
-- =========================================================
create table if not exists public.about_page (
  id integer primary key default 1,
  title_ka text,
  title_en text,
  body_ka text not null default '',
  body_en text not null default '',
  updated_at timestamptz not null default now(),
  constraint about_page_singleton check (id = 1)
);

drop trigger if exists trg_about_page_updated_at on public.about_page;
create trigger trg_about_page_updated_at before update on public.about_page
  for each row execute function public.set_updated_at();

alter table public.about_page enable row level security;

drop policy if exists "about_page_select" on public.about_page;
create policy "about_page_select" on public.about_page
  for select using (true);
drop policy if exists "about_page_update" on public.about_page;
create policy "about_page_update" on public.about_page
  for update using (public.is_admin()) with check (public.is_admin());

-- seed: matches exactly what's live on the site today.
insert into public.about_page (id, title_ka, title_en, body_ka, body_en)
values (1, 'ჩვენს შესახებ', 'About Us', '', '')
on conflict (id) do nothing;

-- =========================================================
-- GRANT-ები — ეს ცხრილები SQL Editor-იდანაა შექმნილი (არა Table Editor UI-დან),
-- ამიტომ anon/authenticated როლებს არცერთი საბაზისო table-level privilege
-- არა აქვთ default-ად. RLS policy მარტო არ კმარა — ეს იგივე გამოსწორებაა,
-- რაც sections/products/hero_slides-ზე ადრე დაგვჭირდა.
-- =========================================================
grant usage on schema public to anon, authenticated;

grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;

grant select on public.contact_info to anon, authenticated;
grant update on public.contact_info to authenticated;

grant insert on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;

grant select on public.about_page to anon, authenticated;
grant update on public.about_page to authenticated;
