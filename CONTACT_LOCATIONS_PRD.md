# PRD: Multi-Location Contact Info (Multiple Phones, Country/Address)

Status: proposed — urgent
Owner: Giorgi (product), Claude Code (implementation)

## 0. Important finding first — read before implementing

The admin's current "Contact Info" panel (single Phone / Email / Address KA / Address EN, bound to the `contact_info` singleton table) is NOT what actually powers the site's real, richer contact info. I checked both places directly:

- `index.html`'s site-wide `<footer>` is **fully hardcoded HTML**, not connected to Supabase at all. It shows TWO physical locations:
  - **Georgia, Tbilisi** — address "ვასილ კოპცოვის 34ბ" / "34b Vasil Koptsovi St", with **two** phone numbers (`+995 599996052` and `+995 599343632`), plus the email `info@dollscoffee.com`.
  - **Greece, Athens** — address "Leoforo Nato 41, Aspropirgos T.K.19300", with one phone number (`+30 697 7538799`). No Georgian translation of this address currently exists (same text is used regardless of language).
  Only the two heading lines ("Georgia, Tbilisi" / "Greece, Athens") go through the `T` translation object; everything else in the footer (phone numbers, both full addresses, the email, the Google Maps links) is raw hardcoded text with zero admin control.
- The admin-managed `contact_info` singleton (already live, already wired to `#page-contact`) only ever captured ONE phone and ONE address (the Tbilisi one) — it has no concept of multiple locations or multiple phone numbers, and never covered Athens at all.

So this isn't just "add a couple of fields to the existing form" — the real, current contact information (2 offices, multiple phone numbers) has never been admin-editable anywhere. This PRD replaces the old single-location model with a proper multi-location one, and wires BOTH the footer and the Contact page to it, so there's one admin-managed source of truth instead of the footer staying permanently hardcoded. Scope note: the `contactForm` (name/email/message → `contact_messages`) is untouched by this change.

## 1. Data model

New table `contact_locations` — one row per physical location:

```sql
create table if not exists public.contact_locations (
  id uuid primary key default gen_random_uuid(),
  label_ka text not null,        -- e.g. 'საქართველო, თბილისი'
  label_en text not null,        -- e.g. 'Georgia, Tbilisi'
  address_ka text not null,      -- e.g. 'ვასილ კოპცოვის 34ბ'
  address_en text not null,      -- e.g. '34b Vasil Koptsovi St'
  phones jsonb not null default '[]'::jsonb,  -- array of display-formatted phone strings, e.g. ["+995 599996052","+995 599343632"]
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
-- zero base privileges by default — the same fix needed twice before for
-- sections/products/hero_slides and for blog_posts/contact_info/about_page).
grant select on public.contact_locations to anon, authenticated;
grant insert, update, delete on public.contact_locations to authenticated;

-- seed: exactly what's live in index.html's footer today, so nothing
-- visually changes until the admin edits it from the panel.
insert into public.contact_locations (label_ka, label_en, address_ka, address_en, phones, sort_order, is_visible)
values
  ('საქართველო, თბილისი', 'Georgia, Tbilisi', 'ვასილ კოპცოვის 34ბ', '34b Vasil Koptsovi St',
   '["+995 599996052", "+995 599343632"]'::jsonb, 0, true),
  ('საბერძნეთი, ათენი', 'Greece, Athens', 'Leoforo Nato 41, Aspropirgos T.K.19300', 'Leoforo Nato 41, Aspropirgos T.K.19300',
   '["+30 697 7538799"]'::jsonb, 1, true);
```

The existing `contact_info` singleton table is **kept**, but narrows to just one field going forward: `email`. Its `phone`, `address_ka`, `address_en` columns become unused/deprecated — leave them in the table as-is (no risky `ALTER TABLE DROP COLUMN`, no data loss risk), just stop reading them anywhere in the UI. `contact_info.email` remains the single, global contact email (unchanged from today).

## 2. Admin panel changes (`admin/admin.js`, `admin/index.html`)

In the "გვერდები" (Pages) tab's Contact Info panel:

- Keep the existing **Email** field, bound to `contact_info.email` exactly as today.
- Remove the current single **Phone** / **Address (KA)** / **Address (EN)** fields — they're replaced by the locations list below.
- Add a **Locations** list, styled consistently with how Sections/Products already work elsewhere in this admin:
  - Each location renders as a card: `label_ka / label_en` heading, `address_ka` / `address_en`, its phone numbers, an **is_visible** toggle, `↑`/`↓` reorder (reuse the existing `swapSortOrder()` helper, same as hero/sections), **Edit**, and **Delete**.
  - **"+ Add location"** opens a modal (same modal pattern as `openProductModal`) with fields: Label (KA), Label (EN), Address (KA), Address (EN), and a **dynamic phone-numbers list** — reuse the exact same "+ add row" pattern already used for product weight variants (`addVariantRow`): a text input per phone number plus a `×` remove button per row, and a "+ ტელეფონის დამატება" button to add another row. On save, collect all non-empty phone inputs into the `phones` jsonb array in entry order.
  - Editing a location opens the same modal pre-filled, including one row per existing phone number.

## 3. Public site changes (`script.js`, `index.html`)

- On page load, fetch `contact_locations` (ordered by `sort_order`) alongside the existing `contact_info`, `sections`, etc.
- **Footer**: replace the two hardcoded `<div class="foot-block">` location blocks in `index.html` with one container that `script.js` fills dynamically — one block per visible location, in `sort_order`: heading (`label_ka`/`label_en` per current language), address line linking to a Google Maps search (`https://www.google.com/maps/search/?api=1&query=` + `encodeURIComponent(address_ka or address_en)`, matching current language), and one `<a href="tel:...">` line per phone number (strip spaces/formatting for the `tel:` href, keep the stored display format as the link text — same approach already used for `CONTACT.phone` in `renderContactInfo()`). Show the global email once, on the first visible location's block, exactly where it appears today.
- **Contact page (`#page-contact`)**: replace the current single phone/address info-lines with the same per-location rendering used in the footer (reuse one shared render function for both), so the Contact page now shows all visible locations instead of just one. Keep the Email info-line as-is, bound to `contact_info.email`. The message form (`#contactForm` → `contact_messages`) is unchanged.
- Graceful empty state: if `contact_locations` returns zero rows (shouldn't happen given the seed above, but keep it safe), hide the locations area rather than rendering broken markup — matching the existing empty-state convention used for hero/products.

## 4. Explicitly out of scope

- The contact message form and `contact_messages` table — unchanged.
- Per-location email addresses — email stays one global field on `contact_info`.
- Storing/editing the Google Maps link separately — it's derived from the address text at render time, not a stored field.
- Dropping the now-unused `contact_info.phone`/`address_ka`/`address_en` columns — left in place, harmless, not read anywhere after this change.

## 5. Acceptance criteria

- [ ] `contact_locations` exists with correct RLS **and** the GRANT statements above (verify with a real, non-admin anon request — not just checking the policies exist).
- [ ] After running the migration, the public site (footer AND Contact page) looks the same as it does today — same two locations, same phone numbers, same email — since the seed matches current content exactly.
- [ ] Admin can add a phone number to Tbilisi (e.g. a third number) and it appears on the live footer and Contact page after refresh.
- [ ] Admin can add a brand-new third location and it appears in both places, in the position its sort order puts it.
- [ ] Toggling a location's visibility off hides it from the footer and Contact page but keeps it visible (editable) in the admin list.
- [ ] Editing the Email field still updates both the footer and the Contact page's email.
- [ ] The contact message form still submits to `contact_messages` exactly as before — untouched by this change.
