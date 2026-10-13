-- =========================================================
-- Doll's Coffee — per-language SEO fields for blog posts and the About page
-- დაამატე ეს სვეტები blog_posts-სა და about_page-ში. ყველა ახალი სვეტი
-- არასავალდებულოა (nullable) — ძველი ჩანაწერები უცვლელად გაგრძელდება
-- მუშაობას, Meta Title/Description უბრალოდ ცარიელი იქნება მათთვის,
-- სანამ ადმინში არ შეავსებ.
--
-- meta_title_* / meta_description_* — გამოსადეგია სოციალურ გაზიარებასა
-- და Google-ის ძიების შედეგებში; თუ ცარიელია, საიტი თავისი ჩვეული
-- title_*/body_*-დან აგენერირებს fallback-ს (იხილე script.js-ის updateSEO()).
-- cover_alt_* — blog_posts-ის cover_photo_url-ის alt ტექსტი, ენის მიხედვით
-- (about_page-ს ამჟამად cover ფოტო არ აქვს, ამიტომ მას ეს სვეტი არ სჭირდება).
-- =========================================================

alter table public.blog_posts add column if not exists meta_title_ka text;
alter table public.blog_posts add column if not exists meta_title_en text;
alter table public.blog_posts add column if not exists meta_description_ka text;
alter table public.blog_posts add column if not exists meta_description_en text;
alter table public.blog_posts add column if not exists cover_alt_ka text;
alter table public.blog_posts add column if not exists cover_alt_en text;

alter table public.about_page add column if not exists meta_title_ka text;
alter table public.about_page add column if not exists meta_title_en text;
alter table public.about_page add column if not exists meta_description_ka text;
alter table public.about_page add column if not exists meta_description_en text;
