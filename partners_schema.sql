-- =========================================================
-- Doll's Coffee — partners schema (Phase 4.5)
-- გაუშვი schema.sql-ის შემდეგ (იყენებს მის set_updated_at()/is_admin()-ს).
-- ლოგოები ინახება არსებულ 'media' bucket-ში, 'partners/' ფოლდერში —
-- ახალი bucket/storage policy არ სჭირდება.
-- =========================================================

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text,
  logo_url text not null,
  link_url text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_partners_updated_at on public.partners;
create trigger trg_partners_updated_at before update on public.partners
  for each row execute function public.set_updated_at();

alter table public.partners enable row level security;

drop policy if exists "partners_select" on public.partners;
create policy "partners_select" on public.partners
  for select using (is_visible = true or public.is_admin());
drop policy if exists "partners_insert" on public.partners;
create policy "partners_insert" on public.partners
  for insert with check (public.is_admin());
drop policy if exists "partners_update" on public.partners;
create policy "partners_update" on public.partners
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "partners_delete" on public.partners;
create policy "partners_delete" on public.partners
  for delete using (public.is_admin());
