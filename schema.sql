-- =========================================================
-- Doll's Coffee — Supabase schema (Phase 3)
-- ეს სკრიპტი უსაფრთხოდ მეორდება (idempotent) — შეგიძლია რამდენჯერმე გაუშვა.
--
-- გაშვების შემდეგ ცალკე გაუშვი admin_rpc.sql (იმატებს/ამკაცრებს
-- is_admin() ფუნქციას და am_i_admin() RPC-ს, admin პანელისთვის).
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- helper: updated_at ავტომატური განახლება ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- ცხრილები
-- =========================================================

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ka text not null,
  name_en text not null,
  accent_color text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete restrict,
  slug text not null,
  name_ka text not null,
  name_en text not null,
  description_ka text not null default '',
  description_en text not null default '',
  photo_url text,
  variants jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, slug)
);
create index if not exists products_section_id_idx on public.products(section_id);

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  photo_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ერთადერთი ადმინის allow-list — RLS ჩართულია, პოლისები არ არსებობს,
-- ანუ ამ ცხრილს anon/authenticated საერთოდ ვერ წვდება პირდაპირ.
-- მხოლოდ SQL Editor-იდან (superuser) შეგიძლია ჩანაწერის დამატება.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_users enable row level security;

-- ---------- updated_at ტრიგერები ----------
drop trigger if exists trg_sections_updated_at on public.sections;
create trigger trg_sections_updated_at before update on public.sections
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_hero_slides_updated_at on public.hero_slides;
create trigger trg_hero_slides_updated_at before update on public.hero_slides
  for each row execute function public.set_updated_at();

-- ---------- variants JSON-ის ვალიდაცია: [{amount:number>0, unit:'gr'|'kg'|'pcs'}] ----------
create or replace function public.validate_product_variants()
returns trigger language plpgsql as $$
declare
  v jsonb;
begin
  if jsonb_typeof(new.variants) is distinct from 'array' then
    raise exception 'variants must be a JSON array';
  end if;
  for v in select * from jsonb_array_elements(new.variants) loop
    if not (v ? 'amount' and v ? 'unit') then
      raise exception 'each variant needs amount and unit fields';
    end if;
    if jsonb_typeof(v->'amount') <> 'number' or (v->>'amount')::numeric <= 0 then
      raise exception 'variant amount must be a positive number';
    end if;
    if v->>'unit' not in ('gr','kg','pcs') then
      raise exception 'variant unit must be gr, kg, or pcs';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_products_validate_variants on public.products;
create trigger trg_products_validate_variants
  before insert or update on public.products
  for each row execute function public.validate_product_variants();

-- =========================================================
-- ერთი ადმინის შემოწმების ფუნქცია (RLS პოლისებში გამოსაყენებლად)
-- =========================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.sections enable row level security;
alter table public.products enable row level security;
alter table public.hero_slides enable row level security;

-- sections: საჯარო კითხვა მხოლოდ ხილულებზე, ადმინს ყველაფრის ნახვა/წერა შეუძლია
drop policy if exists "sections_select" on public.sections;
create policy "sections_select" on public.sections
  for select using (is_visible = true or public.is_admin());
drop policy if exists "sections_insert" on public.sections;
create policy "sections_insert" on public.sections
  for insert with check (public.is_admin());
drop policy if exists "sections_update" on public.sections;
create policy "sections_update" on public.sections
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "sections_delete" on public.sections;
create policy "sections_delete" on public.sections
  for delete using (public.is_admin());

-- products
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select using (is_visible = true or public.is_admin());
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products
  for insert with check (public.is_admin());
drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "products_delete" on public.products;
create policy "products_delete" on public.products
  for delete using (public.is_admin());

-- hero_slides
drop policy if exists "hero_slides_select" on public.hero_slides;
create policy "hero_slides_select" on public.hero_slides
  for select using (is_active = true or public.is_admin());
drop policy if exists "hero_slides_insert" on public.hero_slides;
create policy "hero_slides_insert" on public.hero_slides
  for insert with check (public.is_admin());
drop policy if exists "hero_slides_update" on public.hero_slides;
create policy "hero_slides_update" on public.hero_slides
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "hero_slides_delete" on public.hero_slides;
create policy "hero_slides_delete" on public.hero_slides
  for delete using (public.is_admin());

-- =========================================================
-- Storage bucket: 'media' (public, 5MB, jpeg/png/webp)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "media_select" on storage.objects;
create policy "media_select" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media_insert" on storage.objects;
create policy "media_insert" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_update" on storage.objects;
create policy "media_update" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_delete" on storage.objects;
create policy "media_delete" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());
