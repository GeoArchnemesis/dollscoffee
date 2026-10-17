/* Cloudflare Pages Function - catch-all SSR/meta enhancement layer.
   See seoplan.md ("Phase 2") for the full design rationale. In short: this
   Function runs ahead of static asset serving (scoped down by _routes.json,
   but it must ALSO be correct on its own - see the pass-through fallback
   below - since _routes.json is a performance optimization, not the
   correctness guarantee, after the 404.html lesson from Phase 1).

   For a route it recognizes (ka or /en/-prefixed), it fetches only the data
   that route needs from Supabase and uses HTMLRewriter to inject real text
   content + correct <title>/meta/og/canonical/hreflang into the static
   index.html shell, before handing it back. Client-side JS still runs
   exactly as before and immediately re-renders the same content - this is
   purely so a crawler (or anyone with JS disabled) sees real content and
   correct metadata on the very first response.

   Anything this Function doesn't recognize, or any failure anywhere in
   here, falls through to env.ASSETS.fetch(request) - the plain, unmodified
   static response - so this enhancement layer can never take the site
   down. */

const SUPABASE_URL = 'https://kbpakpxrnhmvgblxozia.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9z7e86IxheobA40rKcWgkA_7cgaQhBx';
const SITE = 'https://dollscoffee.ge';

const MONTH_NAMES = {
  ka: ['იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი','ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December']
};
/* a handful of static UI strings duplicated from script.js's T object - only
   the ones this Function actually needs for <title>/content it builds
   itself (no shared module system between the static site and Functions). */
const STR = {
  ka: { blogTitle:'ბლოგი', contactTitle:'კონტაქტი', aboutTitle:'ჩვენს შესახებ', back:'უკან', base:"Doll's Coffee" },
  en: { blogTitle:'The Blog', contactTitle:'Contact', aboutTitle:'About Us', back:'Back to blog', base:"Doll's Coffee" }
};

function esc(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
function truncate(text, max){
  text = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trim() + '…';
}
function formatBlogDate(dateStr, lang){
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const y = parts[0], m = Number(parts[1]) - 1, d = Number(parts[2]);
  const names = MONTH_NAMES[lang] || MONTH_NAMES.en;
  if (!names[m]) return dateStr;
  return d + ' ' + names[m] + ', ' + y;
}
function variantsText(p, lang){
  if (!p.variants || !p.variants.length) return '';
  return p.variants.map(function(v){
    let unit;
    if (v.unit === 'kg') unit = lang === 'ka' ? 'კგ' : 'kg';
    else if (v.unit === 'pcs') unit = lang === 'ka' ? ' პაკეტი' : ' Pcs';
    else unit = lang === 'ka' ? 'გრ' : 'g';
    return v.amount + unit;
  }).join(' · ');
}

async function sbFetch(path){
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
  });
  if (!res.ok) throw new Error('Supabase fetch failed (' + res.status + '): ' + path);
  return res.json();
}

/* ---------- routing: mirrors parseAndApplyRoute()'s table in script.js ---------- */
function matchRoute(pathname){
  let path = pathname.replace(/\/+$/, '') || '/';
  let lang = 'ka';
  if (path === '/en') { lang = 'en'; path = '/'; }
  else if (path.indexOf('/en/') === 0) { lang = 'en'; path = path.slice(3); }

  if (path === '/') return { type: 'home', lang };
  if (path === '/blog') return { type: 'blogList', lang };
  if (path === '/about') return { type: 'about', lang };
  if (path === '/contact') return { type: 'contact', lang };
  let m = path.match(/^\/blog\/([a-z0-9-]+)$/);
  if (m) return { type: 'post', lang, slug: m[1] };
  m = path.match(/^\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
  if (m) return { type: 'product', lang, category: m[1], slug: m[2] };
  // single-segment path - a candidate category route (e.g. /coffee). /privacy
  // and /terms are explicitly out of scope (see seoplan.md) and excluded here
  // so they fall straight through to null/static pass-through with zero extra
  // Supabase cost, rather than a wasted lookup that would return null anyway.
  if (path !== '/privacy' && path !== '/terms') {
    m = path.match(/^\/([a-z0-9-]+)$/);
    if (m) return { type: 'category', lang, category: m[1] };
  }
  return null; // anything else (unknown slug/category is validated, and
  // falls back to null, inside loadRouteData - same lenient pattern as 'product')
}
/* the ka (unprefixed) path for a matched route - used to build both the ka and en URL variants */
function kaPathFor(route){
  switch (route.type) {
    case 'home': return '/';
    case 'blogList': return '/blog';
    case 'about': return '/about';
    case 'contact': return '/contact';
    case 'post': return '/blog/' + route.slug;
    case 'product': return '/' + route.category + '/' + route.slug;
    case 'category': return '/' + route.category;
  }
}
function urlFor(path, lang){
  const withLang = lang === 'en' ? (path === '/' ? '/en' : '/en' + path) : path;
  return SITE + withLang;
}

/* ---------- markup builders (mirroring script.js's render* functions, but
   without the tap/reveal classes - those are client-side interaction/scroll-
   animation hooks, and reveal specifically sets opacity:0 until JS adds .in,
   which would make server-rendered content invisible to anything that
   doesn't run JS. Client-side render*() calls still replace all of this on
   hydration, exactly as before.) ---------- */
function productCardHtml(p, lang, categorySlug){
  const href = esc(urlFor('/' + categorySlug + '/' + p.slug, lang));
  const swatchStyle = p.photo_url ? "background-image:url('" + p.photo_url + "');background-size:contain;background-repeat:no-repeat;background-position:center;" : '';
  const swatchClass = 'swatch' + (p.photo_url ? '' : ' swatch-empty');
  return '<a class="prod-card" href="' + href + '">'
    + '<span class="' + swatchClass + '" style="' + esc(swatchStyle) + '"></span>'
    + '<span class="rname">' + esc(p['name_' + lang]) + '</span>'
    + '<span class="row-bottom"><span class="rspec">' + esc(variantsText(p, lang)) + '</span>'
    + '<svg class="ico chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>'
    + '</a>';
}
function blogCardHtml(p, lang){
  const href = esc(urlFor('/blog/' + p.slug, lang));
  const coverStyle = p.cover_photo_url ? "background-image:url('" + p.cover_photo_url + "');background-size:cover;background-position:center;" : '';
  const coverClass = 'cover' + (p.cover_photo_url ? '' : ' no-photo');
  return '<a class="post" href="' + href + '">'
    + '<div class="' + coverClass + '" style="' + esc(coverStyle) + '"></div>'
    + '<div class="body"><div class="date">' + esc(formatBlogDate(p.published_at, lang)) + '</div><h3>' + esc(p['title_' + lang]) + '</h3></div>'
    + '</a>';
}
function articleHtml(p, lang){
  const coverStyle = p.cover_photo_url ? "background-image:url('" + p.cover_photo_url + "');background-size:cover;background-position:center;" : '';
  const coverClass = 'cover' + (p.cover_photo_url ? '' : ' no-photo');
  const blogListUrl = esc(urlFor('/blog', lang));
  /* body_ka/body_en is admin-authored Quill HTML, already sanitized with
     DOMPurify at save time in admin.js before it's written to Supabase.
     There's no DOM/DOMPurify available in the Workers runtime to re-sanitize
     on read the way script.js does client-side - this relies entirely on
     that write-time sanitization. Documented trade-off, not a new gap: the
     content source (internal admin panel) is the same either way. */
  return '<a class="back" href="' + blogListUrl + '"><span class="arrow-move">←</span> ' + esc(STR[lang].back) + '</a>'
    + '<h1 style="margin-top:12px">' + esc(p['title_' + lang]) + '</h1>'
    + '<div class="date">' + esc(formatBlogDate(p.published_at, lang)) + '</div>'
    + '<div class="' + coverClass + '" style="' + esc(coverStyle) + '"></div>'
    + '<div class="article-content">' + (p['body_' + lang] || '') + '</div>';
}
function locationBlockHtml(loc, lang){
  const heading = esc(loc['label_' + lang]);
  const addressText = loc['address_' + lang] || '';
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addressText);
  const phonesHtml = (loc.phones || []).map(function(p){
    const telHref = String(p).replace(/[\s\-()]/g, '');
    return '<a class="foot-line" href="tel:' + esc(telHref) + '">' + esc(p) + '</a>';
  }).join('');
  const addressHtml = addressText
    ? '<a class="foot-line" href="' + esc(mapsUrl) + '" target="_blank" rel="noopener">' + esc(addressText) + '</a>'
    : '';
  return '<div class="foot-block"><h4>' + heading + '</h4>' + addressHtml + phonesHtml + '</div>';
}

/* h1 elements present in the static shell, keyed by the route type whose own
   heading each one is. Every one of these is a real h1 in every response
   today (that's the bug - see seoplan.md item 8); for a given route, every
   OTHER entry gets demoted to h2, leaving exactly the matched route's own
   heading (if it has one) as the page's single h1. 'home' has none - its
   hero h1 is deliberately commented out in index.html, not this Function's
   call to restore. */
const H1_SELECTORS = {
  blogList: 'h1[data-t="blogTitle"]',
  about: '#about-title',
  contact: 'h1[data-t="contactTitle"]',
  product: '#pf-name',
  category: '#cat-title'
};
/* these three h1s never belong to any matched route at all (privacy/terms
   are out of scope entirely - see seoplan.md; partners is a shared section
   on every page, not a distinct route) - demote them unconditionally on
   every enhanced response. */
const ALWAYS_DEMOTE_H1 = [
  'h1[data-t="privTitle"]',
  'h1[data-t="termsTitle"]',
  'h1[data-t="partnersTitle"]'
];

/* ---------- per-route data + content ---------- */
async function loadRouteData(route, env, request){
  const { type } = route;
  if (type === 'home') {
    const [sections, products, hero] = await Promise.all([
      sbFetch('sections?select=*&is_visible=eq.true&order=sort_order'),
      sbFetch('products?select=*&is_visible=eq.true&order=sort_order'),
      sbFetch('hero_slides?select=*&is_active=eq.true&order=sort_order&limit=1')
    ]);
    if (!sections.length) return null;
    const first = sections[0];
    const products_in_cat = products.filter(function(p){ return p.section_id === first.id; });
    return { sections, section: first, categorySlug: first.slug, products: products_in_cat, hero: hero[0] || null };
  }
  if (type === 'blogList') {
    return { posts: await sbFetch('blog_posts?select=*&is_published=eq.true&order=published_at.desc') };
  }
  if (type === 'post') {
    const posts = await sbFetch('blog_posts?select=*&is_published=eq.true&slug=eq.' + encodeURIComponent(route.slug));
    if (!posts.length) return null;
    return { post: posts[0] };
  }
  if (type === 'about') {
    const rows = await sbFetch('about_page?select=*&id=eq.1');
    return { about: rows[0] || null };
  }
  if (type === 'contact') {
    const [infoRows, locations] = await Promise.all([
      sbFetch('contact_info?select=*&id=eq.1'),
      sbFetch('contact_locations?select=*&is_visible=eq.true&order=sort_order')
    ]);
    return { info: infoRows[0] || null, locations };
  }
  if (type === 'product') {
    const sections = await sbFetch('sections?select=*&is_visible=eq.true&slug=eq.' + encodeURIComponent(route.category));
    if (!sections.length) return null;
    const products = await sbFetch('products?select=*&is_visible=eq.true&section_id=eq.' + sections[0].id + '&slug=eq.' + encodeURIComponent(route.slug));
    if (!products.length) return null;
    return { section: sections[0], product: products[0] };
  }
  if (type === 'category') {
    const sections = await sbFetch('sections?select=*&is_visible=eq.true&slug=eq.' + encodeURIComponent(route.category));
    if (!sections.length) return null; // unknown slug (or a non-category single-segment path like a bot probe) - lenient fallback, same as 'product'
    const section = sections[0];
    const [products, hero] = await Promise.all([
      sbFetch('products?select=*&is_visible=eq.true&section_id=eq.' + section.id + '&order=sort_order'),
      sbFetch('hero_slides?select=*&is_active=eq.true&order=sort_order&limit=1')
    ]);
    return { section, categorySlug: section.slug, products, hero: hero[0] || null };
  }
  return null;
}

function buildMeta(route, data){
  const { type, lang } = route;
  const kaPath = kaPathFor(route);
  const selfUrl = urlFor(kaPath, lang);
  const kaUrl = urlFor(kaPath, 'ka');
  const enUrl = urlFor(kaPath, 'en');
  const base = STR[lang].base;
  let title = null, description = null, ogImage = null;

  if (type === 'home') {
    // keep the static shell's own homepage <title>/description untouched - no column backs these
    ogImage = (data.hero && data.hero.photo_url) || null;
  } else if (type === 'blogList') {
    title = STR[lang].blogTitle + ' | ' + base;
  } else if (type === 'post') {
    const p = data.post;
    title = p['title_' + lang] + ' | ' + base;
    description = p['meta_description_' + lang] || truncate(p['body_' + lang], 160);
    ogImage = p.cover_photo_url || null;
  } else if (type === 'about') {
    const a = data.about;
    title = ((a && a['title_' + lang]) || STR[lang].aboutTitle) + ' | ' + base;
    description = (a && a['meta_description_' + lang]) || (a && truncate(a['body_' + lang], 160)) || null;
  } else if (type === 'contact') {
    title = STR[lang].contactTitle + ' | ' + base;
  } else if (type === 'product') {
    const p = data.product;
    title = p['name_' + lang] + ' | ' + base;
    description = truncate(p['description_' + lang], 160) || null;
    ogImage = p.photo_url || null;
  } else if (type === 'category') {
    const s = data.section;
    title = s['name_' + lang] + ' | ' + base;
    // generated, not a DB field - sections has no description column today;
    // see seoplan.md if/when real per-category copy is added later.
    description = lang === 'ka'
      ? truncate(s.name_ka + ' — მაღალხარისხიანი არჩევანი Doll\'s Coffee-სგან, AVEK-ის ოფიციალური პარტნიორი საქართველოში.', 160)
      : truncate(s.name_en + ' — a premium selection from Doll\'s Coffee, official AVEK partner in Georgia.', 160);
    ogImage = (data.hero && data.hero.photo_url) || null;
  }
  return { title, description, ogImage, selfUrl, kaUrl, enUrl };
}

function buildRewriter(route, data, meta){
  const { type, lang } = route;
  let rw = new HTMLRewriter();

  rw = rw.on('html', { element(el){ el.setAttribute('lang', lang); } });
  if (meta.title) rw = rw.on('title', { element(el){ el.setInnerContent(meta.title); } });
  if (meta.description) {
    rw = rw.on('meta[name="description"]', { element(el){ el.setAttribute('content', meta.description); } });
    rw = rw.on('meta[property="og:description"]', { element(el){ el.setAttribute('content', meta.description); } });
  }
  if (meta.title) rw = rw.on('meta[property="og:title"]', { element(el){ el.setAttribute('content', meta.title); } });
  rw = rw.on('meta[property="og:url"]', { element(el){ el.setAttribute('content', meta.selfUrl); } });
  rw = rw.on('link[rel="canonical"]', { element(el){ el.setAttribute('href', meta.selfUrl); } });
  if ((type === 'home' || type === 'category') && data.hero) {
    /* the hero slider's image is set via JS (style.backgroundImage) after
       fetchSiteData()'s Supabase round-trip completes, so the browser's
       preload scanner - which only looks at raw HTML, before any JS runs -
       could never discover it, and had to wait for that whole round-trip
       before even starting the image download. This is the dominant LCP
       cost (confirmed: ~8.4s LCP, "LCP request discovery" Lighthouse audit).
       Preloading it here means the image is already downloading in
       parallel with script.js loading/running, so by the time JS sets the
       background-image style, the browser serves it from cache instantly.
       prepend (not append) - this needs to be as early in <head> as
       possible for the preload scanner to find it fastest.
       Two links, each gated by the SAME media breakpoint the CSS/<source>
       use - the browser's preload scanner only actually fetches the one
       whose media query currently matches, so mobile never pulls the
       desktop image (or vice versa). No mobile image for this slide ->
       the mobile-media link just points at the same desktop URL (correct,
       matches the <picture> fallback-to-desktop behavior exactly). */
    const mobileHref = data.hero.photo_url_mobile || data.hero.photo_url;
    rw = rw.on('head', { element(el){
      el.prepend('<link rel="preload" as="image" fetchpriority="high" media="(min-width:641px)" href="' + esc(data.hero.photo_url) + '">', { html: true });
      el.prepend('<link rel="preload" as="image" fetchpriority="high" media="(max-width:640px)" href="' + esc(mobileHref) + '">', { html: true });
    } });
  }
  rw = rw.on('head', { element(el){
    let extra = '<script>window.INITIAL_LANG=' + JSON.stringify(lang) + ';</script>'
      + '<link rel="alternate" hreflang="ka" href="' + esc(meta.kaUrl) + '">'
      + '<link rel="alternate" hreflang="en" href="' + esc(meta.enUrl) + '">'
      + '<link rel="alternate" hreflang="x-default" href="' + esc(meta.kaUrl) + '">';
    if (meta.ogImage) extra += '<meta property="og:image" content="' + esc(meta.ogImage) + '">';
    el.append(extra, { html: true });
  } });

  // demote every OTHER page's h1 to h2 in this response, leaving at most
  // one real h1 (the matched route's own, if it has one - see H1_SELECTORS)
  ALWAYS_DEMOTE_H1.forEach(function(sel){
    rw = rw.on(sel, { element(el){ el.tagName = 'h2'; } });
  });
  Object.keys(H1_SELECTORS).forEach(function(key){
    if (key === type) return;
    rw = rw.on(H1_SELECTORS[key], { element(el){ el.tagName = 'h2'; } });
  });

  if (type === 'home' || type === 'category') {
    if (data.hero) {
      /* the preload link alone only gets the image BYTES ready early - the
         browser still won't PAINT it until something actually applies it
         to an element, which otherwise only happens after client JS
         finishes its own fetchSiteData() round-trip (confirmed via direct
         before/after LCP measurement: preloading alone saved ~1.4s, but
         didn't come close to eliminating the gap, since the paint itself
         was still JS-gated). Rendering the real first slide's markup here
         (same shape renderHero() produces) means the browser can paint it
         immediately from the already-parsed HTML/CSS, with no JS required
         at all. renderHero() unconditionally overwrites #heroSlides once
         fetchSiteData() resolves, so this is purely a first-paint value -
         seamlessly replaced moments later by the identical client render,
         not a lasting fork of this markup. Shared by 'home' and 'category'
         since the hero slider itself is sitewide, not category-specific.
         Same <picture>/<source> art-direction shape as renderHero() - no
         mobile image for this slide -> no <source>, the <img>'s desktop
         src applies at every viewport (the fallback). */
      const h = data.hero;
      const alt = esc(h['alt_' + lang] || '');
      const source = h.photo_url_mobile ? '<source media="(max-width:640px)" srcset="' + esc(h.photo_url_mobile) + '">' : '';
      const heroHtml = '<picture>' + source + '<img src="' + esc(h.photo_url) + '" alt="' + alt + '" fetchpriority="high" loading="eager"></picture>';
      rw = rw.on('#heroSlides', { element(el){ el.setInnerContent('<div class="hero-slide active">' + heroHtml + '</div>', { html: true }); } });
    }
    // shown for 'home' too (default/first category's name - whichever tab is
    // effectively active), not just dedicated 'category' routes - keeps the
    // heading's SSR output consistent with the client's always-visible behavior
    rw = rw.on('#cat-title', { element(el){ el.setInnerContent(esc(data.section['name_' + lang])); } });
    if (data.products.length) {
      const html = data.products.map(function(p){ return productCardHtml(p, lang, data.categorySlug); }).join('');
      rw = rw.on('#prod-list', { element(el){ el.setInnerContent(html, { html: true }); } });
    }
  } else if (type === 'blogList' && data.posts.length) {
    const html = data.posts.map(function(p){ return blogCardHtml(p, lang); }).join('');
    rw = rw.on('#blog-grid', { element(el){ el.setInnerContent(html, { html: true }); } });
  } else if (type === 'post') {
    rw = rw.on('#article-body', { element(el){ el.setInnerContent(articleHtml(data.post, lang), { html: true }); } });
  } else if (type === 'about' && data.about) {
    rw = rw.on('#about-title', { element(el){ el.setInnerContent(esc(data.about['title_' + lang] || STR[lang].aboutTitle)); } });
    rw = rw.on('#about-body', { element(el){ el.setInnerContent(data.about['body_' + lang] || '', { html: true }); } });
  } else if (type === 'contact') {
    if (data.info && data.info.email) {
      rw = rw.on('#contact-email', { element(el){
        el.setAttribute('href', 'mailto:' + data.info.email);
        el.setInnerContent(esc(data.info.email));
      } });
    }
    if (data.locations.length) {
      const html = data.locations.map(function(loc){ return locationBlockHtml(loc, lang); }).join('');
      rw = rw.on('#contact-locations', { element(el){ el.setInnerContent(html, { html: true }); } });
    }
  } else if (type === 'product') {
    const p = data.product, section = data.section;
    rw = rw.on('#pf-cat', { element(el){ el.setInnerContent(esc(section['name_' + lang])); } });
    rw = rw.on('#pf-name', { element(el){ el.setInnerContent(esc(p['name_' + lang])); } });
    rw = rw.on('#pf-blend', { element(el){ el.setInnerContent(esc(variantsText(p, lang))); } });
    rw = rw.on('#pf-desc', { element(el){ el.setInnerContent(esc(p['description_' + lang] || '')); } });
    if (p.photo_url) {
      rw = rw.on('#pf-pack', { element(el){
        el.setAttribute('style', "background-image:url('" + p.photo_url + "');background-size:contain;background-repeat:no-repeat;background-position:center;");
      } });
    } else {
      rw = rw.on('#pf-pack', { element(el){ el.setAttribute('class', el.getAttribute('class') + ' no-photo'); } });
      rw = rw.on('#pf-packname', { element(el){ el.setInnerContent(esc(p['name_' + lang])); } });
    }
  }

  return rw;
}

export async function onRequest(context){
  const { request, env } = context;
  const url = new URL(request.url);

  let route;
  try { route = matchRoute(url.pathname); }
  catch (e) { route = null; }

  if (!route) return env.ASSETS.fetch(request);

  try {
    const data = await loadRouteData(route, env, request);
    if (data === null) return env.ASSETS.fetch(request); // unknown slug/category - same lenient fallback as the client router
    const meta = buildMeta(route, data);
    const assetResponse = await env.ASSETS.fetch(request);
    return buildRewriter(route, data, meta).transform(assetResponse);
  } catch (err) {
    // the enhancement layer must never be a single point of failure for the
    // site being reachable at all
    return env.ASSETS.fetch(request);
  }
}
