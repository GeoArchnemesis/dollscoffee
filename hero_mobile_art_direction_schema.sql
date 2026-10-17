-- =========================================================
-- Doll's Coffee — hero_slides: mobile (1:1) art-direction image,
-- bilingual alt text, and the missing link_url column.
--
-- All four columns are nullable/additive - zero risk to existing rows or
-- running code. photo_url_mobile/alt_ka/alt_en are genuinely new (no hero
-- slide has ever had these). link_url is bundled in because it's
-- referenced throughout admin.js/script.js but was confirmed (via a live
-- read-only query) to not actually exist in the database - the original
-- hero_link_schema.sql migration appears to have never been run.
-- =========================================================

alter table public.hero_slides add column if not exists photo_url_mobile text;
alter table public.hero_slides add column if not exists alt_ka text;
alter table public.hero_slides add column if not exists alt_en text;
alter table public.hero_slides add column if not exists link_url text;
