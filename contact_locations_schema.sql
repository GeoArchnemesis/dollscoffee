-- =========================================================
-- Doll's Coffee — contact_locations schema
-- გაუშვი schema.sql / admin_rpc.sql / blog_contact_about_schema.sql-ის
-- შემდეგ (იყენებს მათ set_updated_at()/is_admin()-ს).
-- =========================================================

create table if not exists public.contact_locations (
  id uuid primary key default gen_random_uuid(),
  label_ka text not null,
  label_en text not null,
  address_ka text not null,
  address_en text not null,
  phones jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_contact_locations_updated_at on public.contact_locations;
create trigger trg_contact_locations_updated_at before update on public.contact_locations
  for each row execute function public.set_updated_at();

alter table public.contact_locations enable row level security;

drop policy if exists "contact_locations_select" on public.contact_locations;
create policy "contact_locations_select" on public.contact_locations
  for select using (is_visible = true or public.is_admin());
drop policy if exists "contact_locations_insert" on public.contact_locations;
create policy "contact_locations_insert" on public.contact_locations
  for insert with check (public.is_admin());
drop policy if exists "contact_locations_update" on public.contact_locations;
create policy "contact_locations_update" on public.contact_locations
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "contact_locations_delete" on public.contact_locations;
create policy "contact_locations_delete" on public.contact_locations
  for delete using (public.is_admin());

-- GRANTs — required in addition to the RLS policies above (this table is
-- created via SQL Editor, not the Table Editor UI, so anon/authenticated get
-- zero base privileges by default).
grant usage on schema public to anon, authenticated;
grant select on public.contact_locations to anon, authenticated;
grant insert, update, delete on public.contact_locations to authenticated;

-- seed: exactly what's live in index.html's footer today, so nothing
-- visually changes until the admin edits it from the panel.
insert into public.contact_locations (label_ka, label_en, address_ka, address_en, phones, sort_order, is_visible)
select * from (values
  ('საქართველო, თბილისი', 'Georgia, Tbilisi', 'ვასილ კოპცოვის 34ბ', '34b Vasil Koptsovi St',
   '["+995 599996052", "+995 599343632"]'::jsonb, 0, true),
  ('საბერძნეთი, ათენი', 'Greece, Athens', 'Leoforo Nato 41, Aspropirgos T.K.19300', 'Leoforo Nato 41, Aspropirgos T.K.19300',
   '["+30 697 7538799"]'::jsonb, 1, true)
) as seed(label_ka, label_en, address_ka, address_en, phones, sort_order, is_visible)
where not exists (select 1 from public.contact_locations);
