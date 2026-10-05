# ADMINUPDATE — ადმინ პანელის დახვეწა (Phase 4.1)

**სტატუსი:** დასამტკიცებელი → შესასრულებელი
**თარიღი:** 2026-09-23
**კონტექსტი:** admin პანელის საბაზისო ვერსია უკვე მუშაობს — ლოგინი, Supabase Auth, RLS, hero/სექციები/პროდუქტების CRUD ტესტირებულია და გამართულია (იხ. ძირითადი PRD). ეს დოკუმენტი მოიცავს UX/ტექსტის ხარვეზებს, რომლებიც პირველი რეალური გამოცდისას გამოვლინდა.

---

## 1. "Hero ფოტოები" → "სლაიდერის ფოტოები"

**რა არის ახლა:** ტაბის ღილაკზე და პანელის სათაურში სწერია "Hero ფოტოები" — ტექნიკური ჟარგონია, მომხმარებლისთვის გაუგებარი.

**რა უნდა გახდეს:** ორივე ადგილას ტექსტი შეიცვალოს **"სლაიდერის ფოტოები"**-თი.

**ფაილი:** `admin/index.html`
- `<button class="tab-btn active" data-tab="hero">Hero ფოტოები</button>` → `სლაიდერის ფოტოები`
- `<h2>Hero ფოტოები</h2>` → `<h2>სლაიდერის ფოტოები</h2>`

ფუნქციონალი არ იცვლება — მხოლოდ ტექსტი.

---

## 2. სლაიდერისა და სექციების თანმიმდევრობა → Drag-and-drop

**რა არის ახლა:** `admin.js`-ში `renderHero()` და `renderSections()` თითოეულ ბარათს ↑/↓ ღილაკებს ურთავს, რომლებიც `swapSortOrder()`-ის საშუალებით ეზიარებ ჩანაწერს გვერდით ჩანაწერს (მუშაობს, ტესტირებულია).

**რა უნდა გახდეს:** ↑/↓ ღილაკების ნაცვლად — **drag-and-drop** გადათრევით მოწესრიგება, როგორც სლაიდერის ფოტოებისთვის (`#heroList`), ისე სექციებისთვის (`#sectionsList`).

**ტექნიკური მითითება:**
- დაშვებულია მსუბუქი დამოკიდებულების დამატება CDN-დან (მაგ. SortableJS `<script>` თეგით, ისე როგორც `@supabase/supabase-js` უკვე ჩართულია) — build-ნაბიჯი არ უნდა დაემატოს პროექტს.
- drop-ის შემდეგ ხელახლა გამოთვალე `sort_order` სიაში მყოფი ყველა ჩანაწერისთვის (0, 1, 2, ...) და შეინახე Supabase-ში (batch update).
- დამატებითი ვიზუალური ნიშანი დაამატე (drag handle ან cursor:grab), რომ ცხადი იყოს რომ ბარათი გადასათრევია.
- პროდუქტების სიისთვის drag-and-drop **არ** არის საჭირო ამ ეტაპზე — მხოლოდ სლაიდერი და სექციები.

---

## 3. პროდუქტების ტაბზე ცარიელი "თეთრი" dropdown და დაბლოკილი "+ ახალი პროდუქტი"

**რა არის ახლა:** პროდუქტების ტაბზე, ღილაკ "+ ახალი პროდუქტის" გვერდით არის სექციით გასაფილტრი dropdown (`#productSectionFilter`), რომელიც სექციების არარსებობისას სრულიად ცარიელი და თეთრია — გაუგებარია, რისთვისაა. ასევე, "+ ახალი პროდუქტის" დაჭერისას იხსნება ფორმა, სადაც "სექცია" select (`#pfSection`) ასევე ცარიელია (სექცია არჩევა შეუძლებელია) — მომხმარებელი ვერ ამატებს პროდუქტს.

**რა უნდა გახდეს:**
- `#productSectionFilter`-ს ყოველთვის ჰქონდეს პირველი, default option: **"ყველა სექცია"** — თუნდაც სექციები არსებობდეს.
- "+ ახალი პროდუქტის" ღილაკზე დაჭერისას, თუ სექციები ჯერ არ არსებობს (`sections.length === 0`), მოდალის გახსნის მაგივრად გამოჩნდეს მკაფიო შეტყობინება: **"jer არცერთი სექცია არ არსებობს — jer დაამატე სექცია 'სექციები' ტაბში."** (იგივე ტონი, რაც უკვე გამოიყენება პროდუქტების ცარიელი სიის შეტყობინებაში).

**შენიშვნა:** სექციების (ყავა/შოკოლადი/ჩაი) დამატებას admin თავად გააკეთებს ხელით "სექციები" ტაბიდან — ეს უკვე მუშაობს, კოდის ცვლილება არ სჭირდება.

---

## 4. Slug-ის ავტომატური გენერაცია

**რა არის ახლა:** `slug` ველი (როგორც პროდუქტის, ისე სექციის ფორმაში) ხელით ივსება.

**რა უნდა გახდეს:** როცა admin წერს ინგლისურ სახელს (`#pfNameEn` პროდუქტისთვის, `#newSectionEn` სექციისთვის), შესაბამისი `slug` ველი (`#pfSlug` / `#newSectionSlug`) **ავტომატურად** ივსებოდეს — მაგ. "Espresso Blend 6" → `espresso-blend-6`.

**წესები:**
- პატარა ასოები, space-ები და non-alphanumeric სიმბოლოები → დეფისი, ზედმეტი დეფისების მოცილება.
- ველი მაინც უნდა დარჩეს ხელით რედაქტირებადი.
- ავტომატური გენერაცია **არ** უნდა გადააწეროს slug, თუ admin-მა ის უკვე ხელით შეცვალა (ე.წ. "touched" მდგომარეობა) — მაგალითად, არსებული პროდუქტის რედაქტირებისას, უკვე შენახული slug არ უნდა გადაიწეროს ავტომატურად.

---

## 5. "+ ვარიანტი" → "+ ახალი წონის დამატება"

**ფაილი:** `admin/admin.js`, `openProductModal()`
`<button type="button" class="btn small" id="addVariantRow">+ ვარიანტი</button>` → `+ ახალი წონის დამატება`

---

## 6. "ვარიანტები (წონა/რაოდენობა)" → "პროდუქტის - წონა/რაოდენობა"

**ფაილი:** `admin/admin.js`, `openProductModal()`
`<div class="variants-head">ვარიანტები (წონა/რაოდენობა)</div>` → `პროდუქტის - წონა/რაოდენობა`

---

## 7. ვარიანტის რაოდენობის input — placeholder "რაოდენობა" → "წონა"

**ფაილი:** `admin/admin.js`, `addVariantRow()`
`<input type="number" ... placeholder="რაოდენობა" ...>` → `placeholder="წონა"`

ერთეულების dropdown (გრ / კგ) უცვლელი რჩება — უკვე სწორია.

---

## 8. Native ბრაუზერის ვალიდაციის ტექსტები ("Please fill out this field") → ქართულად

**რა არის ახლა:** `required` HTML ატრიბუტი გამოიყენება login ფორმაში (`#loginEmail`, `#loginPassword`) და პროდუქტის ფორმაში (`#pfNameKa`, `#pfNameEn`, `#pfSlug`). ამის გამო ცარიელი ველით submit-ისას ბრაუზერი აჩვენებს ინგლისურ default შეტყობინებას ("Please fill out this field").

**რა უნდა გახდეს:** ეს ველები გადავიდეს custom (ქართულენოვან) ვალიდაციაზე, იმავე პატერნით რაც უკვე გამოიყენება სექციის დამატებისას (`alert('შეავსე სახელი (KA/EN) და slug')`) ან არსებული `#loginError` / `#productFormError` ელემენტების საშუალებით. Native ბრაუზერის ვალიდაციის ბუშტი (bubble) აღარ უნდა გამოჩნდეს.

**ტექნიკური მიდგომა (ერთ-ერთი, Claude Code-მ აირჩიოს):**
- `<form novalidate>` + ხელით შემოწმება submit-ზე, Georgian შეტყობინებით; ან
- `setCustomValidity('ქართული ტექსტი')` თითოეულ საჭირო ველზე.

---

## უკვე გადაწყვეტილი საკითხები (მომხმარებელთან დადასტურებული)

- Slider-ის ლეიბლი: **"სლაიდერის ფოტოები"**
- რიგითობის მართვა: **drag-and-drop** (არა ↑/↓)
- პროდუქტების ფილტრი: default option **"ყველა სექცია"**
- საწყისი სექციები (ყავა/შოკოლადი/ჩაი): **admin თავად დაამატებს ხელით**, ავტომატური seed არ სჭირდება.

## Out of scope (ამ ეტაპზე არ შედის)

- პროდუქტების სიის reorder/drag-and-drop.
- საჯარო საიტის (`index.html`/`script.js`) დაკავშირება Supabase-სთან — ეს ცალკე Phase 5-ია, ჯერ არ დაწყებულა.

## მისაღები კრიტერიუმები

- [ ] "სლაიდერის ფოტოები" ჩანს ტაბსა და სათაურში.
- [ ] სლაიდერისა და სექციების ბარათები გადაითრევა mouse-ით და ახალი თანმიმდევრობა შენარჩუნდება გვერდის განახლების შემდეგაც.
- [ ] პროდუქტების ფილტრში ყოველთვის ჩანს "ყველა სექცია".
- [ ] "+ ახალი პროდუქტი" სექციების არარსებობისას აჩვენებს გაფრთხილებას მოდალის ნაცვლად.
- [ ] პროდუქტის/სექციის EN სახელის აკრეფისას slug ავტომატურად ივსება, მაგრამ ხელით რედაქტირებადია და არსებულს არ გადაწერს.
- [ ] "+ ახალი წონის დამატება" და "პროდუქტის - წონა/რაოდენობა" ტექსტები ჩანს.
- [ ] წონის input-ს placeholder-ად "წონა" სწერია.
- [ ] ცარიელი სავალდებულო ველით submit-ისას ჩანს ქართული შეტყობინება, არა ინგლისური ბრაუზერის ბუშტი.

---

# Phase 4.5 — ახალი სექცია: "პარტნიორები" (storefront + admin)

**სტატუსი:** შესასრულებელი
**თარიღი:** 2026-10-05
**მოთხოვნა:** მთავარ გვერდზე, content-ის ბოლოს (ნებისმიერი აქტიური slider/სექციის შემდეგ) და footer-ის წინ გამოჩნდეს პარტნიორი კომპანიების ლოგოების სექცია "პარტნიორები". Admin პანელიდან უნდა შეიძლებოდეს ლოგოების ატვირთვა, თითოეულისთვის არასავალდებულო ბმულის მითითება (დააჭირო ლოგოს და წავა პარტნიორის საიტზე), დალაგება და ჩართვა/გამორთვა.

## 1. მონაცემთა ბაზა (ცხრილი: `partners`)

ახალი ცხრილი, მოდელირებული ზუსტად `hero_slides`-ის ანალოგიურად (იხ. `schema.sql` ~ხაზი 54), მაგრამ `link_url`-ითა და `name`-ით თავიდანვე სქემაში (hero_slides-ში link_url ცოცხალ ბაზაშია დამატებული, მაგრამ schema.sql ფაილში არასდროს ასახულა — აქ ეს ხარვეზი არ გავიმეოროთ):

```sql
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

drop policy if exists "partners_admin_all" on public.partners;
create policy "partners_admin_all" on public.partners
  for all using (public.is_admin()) with check (public.is_admin());
```

(გადაამოწმე `sections`/`hero_slides`-ის არსებული admin RLS პოლისების ზუსტი ფორმა და მიჰყევი იმავე პატერნს ზუსტად — ზემოთ მოცემული მხოლოდ გონივრული საწყისია.)

ლოგოები აიტვირთება უკვე არსებულ `media` storage bucket-ში (იხ. `schema.sql` ~ხაზი 176), ახალი ქვე-საქაღალდით, მაგ. `partners/` — ახალი bucket/policy არ სჭირდება, არსებული `media_select`/`media_insert`/`media_update`/`media_delete` პოლისები ყველა ფოლდერს ეხება.

**ეს ცვლილება ცოცხალ Supabase ბაზაშიც უნდა გაეშვას შენით (თუ შეგიძლია), ან, თუ ვერ შეძლებ (წინა ფაზების გამოცდილებით, service_role/DB წვდომა არ გაქვს), მომეცი ზუსტად ის SQL, რომელიც მე თვითონ გავუშვებ Supabase SQL Editor-ში — ნუ დატოვებ ამას მხოლოდ `schema.sql` ფაილში, რადგან ფაილის ცვლილება ცოცხალ ბაზას არ ცვლის.**

## 2. ადმინ პანელი (`admin/index.html`, `admin/admin.js`)

ახალი ტაბი, ზუსტად იმავე სტრუქტურით, რაც უკვე არსებული "სლაიდერის ფოტოები" ტაბია (`admin/index.html` ~ხაზი 37-56):

```html
<button class="tab-btn" data-tab="partners">პარტნიორები</button>
```
```html
<section id="tab-partners" class="tab-panel" hidden>
  <div class="panel-head">
    <h2>პარტნიორები</h2>
    <label class="btn solid upload-btn">+ ახალი ლოგო
      <input type="file" id="partnerFileInput" accept="image/jpeg,image/png,image/webp,.heic,.heif" hidden>
    </label>
  </div>
  <p class="hint">რეკომენდებული ზომა ~400×200px, სასურველია გამჭვირვალე (transparent) PNG.</p>
  <div id="partnersList" class="hero-list"></div>
</section>
```
(tab-switching ლოგიკა `admin.js`-ში უკვე გენერიკულია `data-tab`/`#tab-<name>` წყვილზე — ცალკე wiring არ სჭირდება.)

`admin/admin.js`-ში დაამატე `partners` state + `loadPartners()`/`renderPartners()`/`handlePartnerFileChange()`, **ზუსტად** `heroSlides`/`loadHero()`/`renderHero()`/`handleHeroFileChange()`-ის ანალოგიით (~ხაზი 256-330), იმ განსხვავებით, რომ:
- თითოეულ ბარათს დაემატოს არჩევითი `name` ტექსტური input (`.f-name`, placeholder "სახელი (არასავალდებულო)") — `update({ name: value || null })` ცვლილებაზე, ზუსტად `.f-link`-ის პატერნით.
- `.f-link` (ლინკი) იგივე პატერნით, რაც hero-ს აქვს.
- ვიზიბილიტი: `is_visible` ველი (არა `is_active`, hero_slides-ისგან განსხვავებით — `sections`-ის/`products`-ის კონვენციას მიჰყევი, ანუ auto-save `change`-ზე, Phase 4.2-ში უკვე გასწორებული sections-ის პატერნით).
- drag handle + `Sortable.create` + `persistOrder('partners', ids)` — ზუსტად hero-ს პატერნით.
- წაშლისას `deleteImage(partner.logo_url)` გამოძახება ზუსტად hero-ს პატერნით.
- ატვირთვა: `uploadImage(file, 'partners', 400, 200, 120 * 1024)` (ლოგო გაცილებით პატარაა ვიდრე hero ფოტო — 1600×800 არ გჭირდება).
- `loadAll()` ფუნქციაში დაამატე `loadPartners()` უკვე არსებულ `Promise.all([...])`-ში.

## 3. საჯარო საიტი (`index.html`, `script.js`)

**HTML (`index.html`):** ახალი სექცია `</main>`-სა და `<footer>`-ს შორის (ანუ გლობალურია — ყველა გვერდზე ჩანს, ზუსტად footer-ის წინ):

```html
<section id="partners-section" class="wrap partners-section" hidden>
  <h2 data-t="partnersTitle"></h2>
  <div class="partners-row" id="partnersRow"></div>
</section>
```

**i18n:** დაამატე `partnersTitle` არსებულ თარგმანების ობიექტში (script.js-ში, სადაც სხვა `data-t` key-ებია განსაზღვრული) — ka: "ჩვენი პარტნიორები", en: "Our Partners".

**script.js:**
- `fetchSiteData()`-ში დაამატე პარტნიორების query, იმავე წესით რაც `SECTIONS`/`HERO`-ს: `sb.from('partners').select('*').eq('is_visible', true).order('sort_order')` → გლობალურ `PARTNERS` მასივში.
- ახალი ფუნქცია, რომელიც ივსება `fetchSiteData()`-ს შემდეგ (ზუსტად `renderHero()`-ს გამოძახების გვერდით):
```js
function renderPartners(){
  const section = document.getElementById('partners-section');
  const row = document.getElementById('partnersRow');
  if(!PARTNERS.length){ if(section) section.hidden = true; return; }
  section.hidden = false;
  row.innerHTML = PARTNERS.map(function(p){
    const img = '<img src="'+esc(p.logo_url)+'" alt="'+esc(p.name||'')+'" loading="lazy">';
    return p.link_url
      ? '<a class="partner-logo" href="'+esc(p.link_url)+'" target="_blank" rel="noopener noreferrer">'+img+'</a>'
      : '<span class="partner-logo">'+img+'</span>';
  }).join('');
}
```
(გამოიყენე უკვე არსებული `esc()` helper — არ გამოიგონო ახალი escaping.)

**styles.css:** მარტივი, responsive, grayscale→color hover ეფექტით (common პატერნი პარტნიორი ლოგოებისთვის):
```css
.partners-section{padding:40px 0 10px;text-align:center}
.partners-section h2{font-size:clamp(18px,2.2vw,24px);margin:0 0 22px}
.partners-row{display:flex;flex-wrap:wrap;gap:28px;justify-content:center;align-items:center}
.partner-logo{display:inline-flex;align-items:center;justify-content:center;height:56px}
.partner-logo img{max-height:100%;max-width:140px;object-fit:contain;filter:grayscale(1);opacity:.65;transition:filter .25s,opacity .25s}
.partner-logo:hover img{filter:grayscale(0);opacity:1}
@media (max-width:640px){.partners-row{gap:20px}.partner-logo{height:44px}.partner-logo img{max-width:100px}}
```

## გადამოწმება (ნუ დაწერ "დასრულებულია", სანამ რეალურად არ შეამოწმებ)

- [ ] `partners` ცხრილი რეალურად შექმნილია ცოცხალ Supabase ბაზაში (არა მხოლოდ `schema.sql`-ში) — ან მომეცი ზუსტი SQL, რომ მე გავუშვა.
- [ ] Admin-ში ახალი "პარტნიორები" ტაბი ჩანს, ლოგოს ატვირთვა მუშაობს, სახელი/ლინკი/ხილვადობა/წაშლა/drag-reorder ყველა მუშაობს და გვერდის refresh-ის შემდეგაც ინახება.
- [ ] საჯარო საიტზე, როცა ერთი ან მეტი ხილვადი პარტნიორია, სექცია ჩანს footer-ის ზემოთ ყველა გვერდზე; როცა არცერთი არ არის, სექცია საერთოდ არ ჩანს (არა ცარიელი სივრცე).
- [ ] ლოგოზე დაჭერით (თუ ლინკი მითითებულია) იხსნება ახალ ტაბში `target="_blank"`-ით; ლინკის გარეშე ლოგო უბრალოდ ჩანს, არაკლიკადი.
- [ ] GE/EN toggle სწორად ცვლის "ჩვენი პარტნიორები"/"Our Partners" სათაურს.
- [ ] `admin/admin.js`-ში `products`/`sections`-ის არსებული ფუნქციონალი უცვლელია — მხოლოდ დამატება, არაფრის წაშლა/შეცვლა.

**ნუ შეეხები:** hero, sections, products, cookie-related კოდს, Phase 4.4-ის hero-overlay ცვლილებებს. Git push არ გააკეთო — ჩემზეა.
