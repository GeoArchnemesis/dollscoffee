/* ---------- Supabase client ----------
   Publishable key is meant to be public in client code - access is governed
   by Row Level Security + the admin_users allow-list (see schema.sql). */
const SUPABASE_URL = 'https://kbpakpxrnhmvgblxozia.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9z7e86IxheobA40rKcWgkA_7cgaQhBx';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

/* live catalog data, fetched once on load - see fetchSiteData() */
let SECTIONS = [];   // [{id,slug,name_ka,name_en,accent_color,sort_order}, ...]
let PRODUCTS = {};   // slug -> [{id,slug,name_ka,name_en,description_ka,description_en,photo_url,variants,sort_order}, ...]
let HERO = [];        // [{id,photo_url,sort_order}, ...]
let BLOG = [];        // [{id,slug,title_ka,title_en,cover_photo_url,body_ka,body_en,published_at,is_published}, ...]
let CONTACT = null;   // {email} - phone/address_ka/address_en are deprecated, see contact_locations
let ABOUT = null;     // {title_ka,title_en,body_ka,body_en}
let LOCATIONS = [];   // [{id,label_ka,label_en,address_ka,address_en,phones,sort_order,is_visible}, ...]

async function fetchSiteData(){
  const [secRes, prodRes, heroRes, blogRes, contactRes, aboutRes, locRes] = await Promise.all([
    sb.from('sections').select('*').eq('is_visible', true).order('sort_order'),
    sb.from('products').select('*').eq('is_visible', true).order('sort_order'),
    sb.from('hero_slides').select('*').eq('is_active', true).order('sort_order'),
    sb.from('blog_posts').select('*').eq('is_published', true).order('published_at', { ascending: false }),
    sb.from('contact_info').select('*').eq('id', 1).maybeSingle(),
    sb.from('about_page').select('*').eq('id', 1).maybeSingle(),
    sb.from('contact_locations').select('*').eq('is_visible', true).order('sort_order')
  ]);
  SECTIONS = secRes.data || [];
  HERO = heroRes.data || [];
  BLOG = blogRes.data || [];
  CONTACT = contactRes.data || null;
  ABOUT = aboutRes.data || null;
  LOCATIONS = locRes.data || [];
  PRODUCTS = {};
  SECTIONS.forEach(function(s){ PRODUCTS[s.slug] = []; });
  (prodRes.data || []).forEach(function(p){
    const sec = SECTIONS.find(function(s){ return s.id === p.section_id; });
    if(!sec) return;
    PRODUCTS[sec.slug].push(p);
  });
}
/* manual month lookup instead of Intl/toLocaleString - Georgian locale/ICU
   support is inconsistent across browsers, so blog dates are formatted by hand. */
const MONTH_NAMES = {
  ka: ['იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი','ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December']
};
function formatBlogDate(dateStr){
  if(!dateStr) return '';
  const parts = String(dateStr).split('-');
  if(parts.length !== 3) return dateStr;
  const y = parts[0], m = Number(parts[1]) - 1, d = Number(parts[2]);
  const names = MONTH_NAMES[lang] || MONTH_NAMES.en;
  if(!names[m]) return dateStr;
  return d + ' ' + names[m] + ', ' + y;
}
function variantsText(p){
  if(!p.variants || !p.variants.length) return '';
  return p.variants.map(function(v){
    const unit = v.unit==='kg' ? (lang==='ka'?'კგ':'kg') : (lang==='ka'?'გრ':'g');
    return v.amount+unit;
  }).join(' · ');
}
function esc(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

const T = {
  ka:{home:'მთავარი',blog:'ბლოგი',contact:'კონტაქტი',about:'ჩვენს შესახებ',coffee:'ყავა',chocolate:'შოკოლადი',tea:'ჩაი',viewProduct:'პროდუქტის დეტალები',
    blogEyebrow:'ჟურნალი',blogTitle:'ბლოგი',contactEyebrow:'დაგვიკავშირდი',contactTitle:'კონტაქტი',
    aboutEyebrow:'გავიცანით ერთმანეთი',aboutTitle:'ჩვენს შესახებ',aboutLead:'',
    phone:'ტელეფონი',address:'მისამართი',addressVal:'საქართველო, თბილისი, ვასილ კოპცოვის 34ბ',partnerK:'პარტნიორი',
    fName:'სახელი',fEmail:'ელ. ფოსტა',fMsg:'შეტყობინება',fSend:'გაგზავნა',sent:'მადლობა! შეტყობინება გაიგზავნა.',back:'უკან ბლოგზე',
    priv:'კონფიდენციალურობის პოლიტიკა',terms:'გამოყენების წესები',rights:'ყველა უფლება დაცულია',
    privTitle:'კონფიდენციალურობის პოლიტიკა',privLead:'',privP1:'',termsTitle:'გამოყენების წესები',termsLead:'',termsP1:'',viewFull:'სრული დოკუმენტის ნახვა',
    cookieText:'საიტი იყენებს cookie-ებს გამოცდილების გასაუმჯობესებლად.',cookieAccept:'კარგი',cookieDecline:'უარყოფა',
    marqueeText:'· 100% არაბიკა · AVEK-ის ოფიციალური პარტნიორი, საბერძნეთი · ხელით შერჩეული ბლენდები ',
    footTbilisiHeading:'საქართველო, თბილისი',footTbilisiAddress:'ვასილ კოპცოვის 34ბ',footAthensHeading:'საბერძნეთი, ათენი',
    heroPlaceholder:'ფოტო მალე დაემატება', emptyProducts:'მალე დაემატება ახალი პროდუქტები', emptyBlog:'ბლოგის პირველი პოსტი მალე გამოქვეყნდება'},
  en:{home:'Home',blog:'Blog',contact:'Contact',about:'About Us',coffee:'Coffee',chocolate:'Chocolate',tea:'Tea',viewProduct:'Product details',
    blogEyebrow:'Journal',blogTitle:'The Blog',contactEyebrow:'Get in touch',contactTitle:'Contact',
    aboutEyebrow:'Get to know us',aboutTitle:'About Us',aboutLead:'',
    phone:'Phone',address:'Address',addressVal:'34b Vasil Koptsovi St, Tbilisi, Georgia',partnerK:'Partner',
    fName:'Name',fEmail:'Email',fMsg:'Message',fSend:'Send message',sent:'Thank you! Your message was sent.',back:'Back to blog',
    priv:'Privacy Policy',terms:'Terms of use',rights:'All Rights Reserved',
    privTitle:'Privacy Policy',privLead:'',privP1:'',termsTitle:'Terms of use',termsLead:'',termsP1:'',viewFull:'View full document',
    cookieText:'This site uses cookies to improve your experience.',cookieAccept:'Got it',cookieDecline:'Decline',
    marqueeText:'· 100% Arabica · Official partner of AVEK, Greece · Hand-selected blends ',
    footTbilisiHeading:'Georgia, Tbilisi',footTbilisiAddress:'34b Vasil Koptsovi St',footAthensHeading:'Greece, Athens',
    heroPlaceholder:'Photo coming soon', emptyProducts:'New products coming soon', emptyBlog:'The first blog post is coming soon'}
};
/* ---------- base path ----------
   BASE_PATH is computed automatically, once, in index.html/404.html's
   <head> (window.BASE_PATH), based on the current hostname/URL. This
   file only reads it - it is never hardcoded here or anywhere else. */
const BASE_PATH = window.BASE_PATH || '';
function withBase(p){
  if(!BASE_PATH) return p;
  return p==='/' ? BASE_PATH+'/' : BASE_PATH+p;
}
function stripBase(path){
  if(BASE_PATH && path.indexOf(BASE_PATH)===0){
    path = path.slice(BASE_PATH.length);
    if(path==='') path='/';
  }
  return path;
}

let lang='ka', activeCat='coffee', prodIndex=0, currentView='home', currentArticle=null;
let lastCat='coffee', lastIndex=0;

/* ---------- theme ---------- */
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  const mc = document.querySelector('meta[name="theme-color"]');
  if(mc) mc.setAttribute('content', t==='dark' ? '#1B1512' : '#F3E9DA');
  try{ localStorage.setItem('doc-theme', t); }catch(e){}
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}
function initTheme(){
  let t='light';
  try{
    const saved = localStorage.getItem('doc-theme');
    if(saved){ t=saved; }
    /* intentionally NOT checking prefers-color-scheme here: the site always
       starts in light mode by default; dark mode only activates if the
       visitor has explicitly turned it on before (saved in localStorage). */
  }catch(e){}
  applyTheme(t);
}

/* ---------- SEO: keep title/canonical/og:url in sync with the SPA route ---------- */
function updateSEO(pathAbs, titleSuffix){
  const base = "Doll's Coffee";
  document.title = titleSuffix ? (titleSuffix+' | '+base) : base+' — ყავა, შოკოლადი და ჩაი';
  const full = 'https://www.dollscoffee.ge'+(pathAbs==='/'?'':pathAbs);
  const canon = document.querySelector('link[rel="canonical"]');
  if(canon) canon.setAttribute('href', full);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if(ogUrl) ogUrl.setAttribute('content', full);
}

/* ---------- mobile menu ---------- */
function toggleMenu(){
  const menu=document.getElementById('menu'), btn=document.getElementById('burgerBtn');
  const open = !menu.classList.contains('open');
  menu.classList.toggle('open', open);
  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function skipToMain(e){
  e.preventDefault();
  const m=document.getElementById('main-content');
  if(!m) return;
  m.setAttribute('tabindex','-1');
  m.focus();
}

/* ---------- cookie consent ---------- */
function acceptCookies(){
  try{ localStorage.setItem('cookie-consent','accepted'); }catch(e){}
  const bar=document.getElementById('cookieBar');
  if(bar) bar.hidden=true;
}
function declineCookies(){
  try{ localStorage.setItem('cookie-consent','declined'); }catch(e){}
  const bar=document.getElementById('cookieBar');
  if(bar) bar.hidden=true;
}
function initCookieBar(){
  let decided=false;
  try{ decided = !!localStorage.getItem('cookie-consent'); }catch(e){}
  const bar=document.getElementById('cookieBar');
  if(bar) bar.hidden = decided;
}

/* ---------- view-transition helper (progressive enhancement) ---------- */
function withTransition(fn){
  try{
    if(document.startViewTransition){ document.startViewTransition(fn); return; }
  }catch(e){ /* fall through to direct call below */ }
  fn();
}

/* ---------- scroll reveal ---------- */
let revealObserver=null;
function initReveal(){
  if(revealObserver) return;
  if(!('IntersectionObserver' in window)){
    document.querySelectorAll('.reveal').forEach(el=>el.classList.add('in'));
    return;
  }
  revealObserver = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in'); revealObserver.unobserve(en.target); } });
  },{threshold:0, rootMargin:'0px 0px 200px 0px'});
}
function observeReveal(container){
  initReveal();
  if(!revealObserver){ container.querySelectorAll('.reveal').forEach(el=>el.classList.add('in')); return; }
  container.querySelectorAll('.reveal:not(.in)').forEach(el=>revealObserver.observe(el));
}

/* ---------- lazy-load background-image photos below the fold ----------
   CSS background-image gets no native lazy-loading (that only exists on
   <img>), so this defers setting el.style.backgroundImage until the element
   nears the viewport. Used for grid/list photos only - never for the hero
   slider or a single product/post's own detail-page photo, which are the
   exact content the visitor navigated to see and must load immediately. */
function lazyBackground(el, url){
  if(!url) return;
  if(!('IntersectionObserver' in window)){ el.style.backgroundImage = "url('"+url+"')"; return; }
  const io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.style.backgroundImage = "url('"+url+"')";
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });
  io.observe(el);
}

/* ---------- language ----------
   NOTE: earlier versions tried to rewrite the URL path (e.g. appending /ka or /en)
   using history.replaceState. On a static single HTML file this produces an
   invalid path like ".../dollscoffee.html/ka", which the browser cannot resolve
   and effectively reloads/breaks navigation. Language switching is UI-only here;
   it never touches the URL. (A real multi-page build, e.g. Astro, would serve
   /ka and /en as actual routes instead.) */
/* ---------- hero: standard slider (arrows + dots), auto-advances every 5s
   unless the visitor navigates manually, in which case the timer restarts.
   Hidden entirely when there are no active hero slides. ---------- */
let heroIndex=0, heroTimer=null;
function renderHero(){
  const heroEl=document.getElementById('hero');
  const slidesEl=document.getElementById('heroSlides');
  const dotsEl=document.getElementById('heroDots');
  if(!slidesEl) return;
  if(!HERO.length){
    if(heroEl) heroEl.hidden = true;
    return;
  }
  if(heroEl) heroEl.hidden = false;
  slidesEl.innerHTML = HERO.map(function(s,i){
    const bgStyle = "background-image:url('"+s.photo_url+"');background-size:cover;background-position:center;";
    const activeClass = i===0 ? ' active' : '';
    if(s.link_url){
      return '<a class="hero-slide'+activeClass+'" style="'+bgStyle+'" href="'+esc(s.link_url)+'" target="_blank" rel="noopener noreferrer"></a>';
    }
    return '<div class="hero-slide'+activeClass+'" style="'+bgStyle+'"></div>';
  }).join('');
  if(dotsEl){
    dotsEl.innerHTML = HERO.map(function(_,i){
      return '<button class="'+(i===0?'on':'')+'" aria-label="ფოტო '+(i+1)+'" onclick="goToHeroSlide('+i+')"></button>';
    }).join('');
  }
  heroIndex=0;
}
function setHeroSlide(i){
  const slides=document.querySelectorAll('#heroSlides .hero-slide');
  const dots=document.querySelectorAll('#heroDots button');
  if(!slides.length) return;
  slides[heroIndex] && slides[heroIndex].classList.remove('active');
  dots[heroIndex] && dots[heroIndex].classList.remove('on');
  heroIndex=(i+slides.length)%slides.length;
  slides[heroIndex].classList.add('active');
  if(dots[heroIndex]) dots[heroIndex].classList.add('on');
}
function heroStep(dir){ setHeroSlide(heroIndex+dir); startHeroRotation(); }
function goToHeroSlide(i){ setHeroSlide(i); startHeroRotation(); }
function startHeroRotation(){
  clearInterval(heroTimer);
  if(HERO.length < 2) return;
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  heroTimer=setInterval(function(){ setHeroSlide(heroIndex+1); }, 5000);
}

function toggleLang(){ setLang(lang==='ka' ? 'en' : 'ka'); }
function setLang(l){
  lang=l; document.documentElement.lang=l;
  document.getElementById('ka').classList.toggle('active',l==='ka');
  document.getElementById('en').classList.toggle('active',l==='en');
  renderCategoryButtons();
  renderText();
  renderProdList();
  if(!document.getElementById('detail').classList.contains('hidden')) renderDetail(true);
  if(currentView==='product') renderProductPage(true);
  renderBlog(); renderArticle();
  renderContactInfo(); renderContactLocations(); renderAboutPage();
}
function renderText(){
  document.querySelectorAll('[data-t]').forEach(el=>{const v=T[lang][el.dataset.t];if(v!==undefined)el.textContent=v;});
  document.querySelectorAll('[data-nav]').forEach(a=>{a.textContent=T[lang][a.dataset.nav];a.classList.toggle('active',a.dataset.nav===currentView);});
}
const PAGE_PATHS={home:'/',blog:'/blog',about:'/about',contact:'/contact',privacy:'/privacy',terms:'/terms'};
function go(view, opts){
  opts = opts || {};
  const push = opts.push!==false;
  const doIt=function(){
    currentView=view;
    ['home','blog','about','contact','article','privacy','terms','product'].forEach(v=>document.getElementById('page-'+v).classList.toggle('show',v===view));
    document.getElementById('menu').classList.remove('open');
    document.getElementById('burgerBtn').classList.remove('open');
    document.getElementById('burgerBtn').setAttribute('aria-expanded','false');
    document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===view));
  };
  withTransition(doIt);
  if(push && PAGE_PATHS[view]!==undefined){
    try{ history.pushState({view:view}, '', withBase(PAGE_PATHS[view])); }catch(e){}
  }
  window.scrollTo({top:0});
  if(PAGE_PATHS[view]!==undefined){
    const aboutTitle = (ABOUT && ABOUT['title_'+lang]) || T[lang].aboutTitle;
    const titleMap={home:null,blog:T[lang].blogTitle,about:aboutTitle,contact:T[lang].contactTitle,privacy:T[lang].privTitle,terms:T[lang].termsTitle};
    updateSEO(PAGE_PATHS[view], titleMap[view]);
  }
}
function setAccent(cat){
  const map={coffee:['--coffee','--coffee-deep','--coffee-soft'],chocolate:['--choc','--choc-deep','--choc-soft'],tea:['--tea','--tea-deep','--tea-soft']};
  const entry = map[cat];
  if(!entry) return;
  const a=entry[0],d=entry[1],s=entry[2],r=document.documentElement.style;
  r.setProperty('--accent','var('+a+')');r.setProperty('--accent-deep','var('+d+')');r.setProperty('--accent-soft','var('+s+')');
}
/* ---------- inline row placement for the detail slider ----------
   Instead of always living in a fixed spot after the whole grid, #detail
   is physically moved to sit right after the row containing the selected
   product - so it opens directly beneath that row, and closes/reopens
   in the new row when a different product (in a different row) is picked. */
function getColumnCount(){
  const w = window.innerWidth;
  if(w >= 1000) return 4;
  if(w >= 640) return 3;
  return 2;
}
function insertDetailAfterRow(i){
  const grid = document.getElementById('prod-list');
  const cards = grid.querySelectorAll('.prod-card');
  if(!cards.length) return;
  const cols = getColumnCount();
  const row = Math.floor(i / cols);
  const lastIndexInRow = Math.min((row+1)*cols - 1, cards.length - 1);
  const anchorCard = cards[lastIndexInRow];
  const detail = document.getElementById('detail');
  const nextEl = anchorCard.nextSibling;
  if(nextEl !== detail){ grid.insertBefore(detail, nextEl); }
}

function insertDetailAtEnd(){
  const grid=document.getElementById('prod-list');
  const detail=document.getElementById('detail');
  grid.appendChild(detail);
}
function renderCategoryButtons(){
  const wrap = document.querySelector('.cats');
  if(!wrap) return;
  wrap.innerHTML = SECTIONS.map(function(s){
    const cls = 'cat-btn tap reveal c-'+s.slug+(s.slug===activeCat?' active':'');
    return '<button class="'+cls+'" data-cat="'+s.slug+'" onclick="activateCategory(\''+s.slug+'\',{scroll:false})">'+esc(s['name_'+lang])+'</button>';
  }).join('');
  Array.prototype.forEach.call(wrap.querySelectorAll('.cat-btn'), function(el,i){ el.style.transitionDelay=(i*70)+'ms'; });
  observeReveal(wrap);
}
function activateCategory(cat, opts){
  opts = opts || {};
  activeCat=cat; setAccent(cat);
  document.querySelectorAll('.cat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===cat));
  renderProdList();
  prodIndex=0;
  const detailEl = document.getElementById('detail');
  const hasProducts = (PRODUCTS[cat]||[]).length > 0;
  if(hasProducts){
    insertDetailAtEnd();
    detailEl.classList.remove('hidden');
    renderDetail(false);
  } else {
    detailEl.classList.add('hidden');
  }
  if(opts.scroll) setTimeout(()=>document.getElementById('list-section').scrollIntoView({behavior:'smooth'}),40);
}
function renderProdList(){
  const wrap=document.getElementById('prod-list');
  const detailEl=document.getElementById('detail');
  if(detailEl.parentNode===wrap){ document.getElementById('list-section').appendChild(detailEl); }
  wrap.innerHTML='';
  const list = PRODUCTS[activeCat] || [];
  if(!list.length){
    wrap.innerHTML = '<p class="empty-note">'+esc(T[lang].emptyProducts)+'</p>';
    return;
  }
  list.forEach((p,i)=>{
    const card=document.createElement('button'); card.className='prod-card tap reveal'; card.style.transitionDelay=(Math.min(i,6)*20)+'ms'; card.onclick=()=>selectProduct(i);
    const swatchStyle = p.photo_url ? "background-size:contain;background-repeat:no-repeat;background-position:center;" : '';
    const swatchClass = 'swatch'+(p.photo_url?'':' swatch-empty');
    card.innerHTML='<span class="'+swatchClass+'" style="'+swatchStyle+'"></span>'
      +'<span class="rname">'+esc(p['name_'+lang])+'</span>'
      +'<span class="row-bottom"><span class="rspec">'+esc(variantsText(p))+'</span>'
      +'<svg class="ico chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>';
    wrap.appendChild(card);
    if(p.photo_url){ lazyBackground(card.querySelector('.swatch'), p.photo_url); }
  });
  observeReveal(wrap);
}
function selectProduct(i){
  const cards=document.querySelectorAll('#prod-list .prod-card');
  const swatch=cards[i] ? cards[i].querySelector('.swatch') : null;
  const pack=document.getElementById('d-pack');
  const canMorph = !!(swatch && document.startViewTransition);

  const openIt=function(){
    insertDetailAfterRow(i);
    prodIndex=i;
    document.getElementById('detail').classList.remove('hidden');
    renderDetail(false, true);
  };
  const scrollIn=function(){
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        document.getElementById('detail').scrollIntoView({behavior:'smooth', block:'start'});
      });
    });
  };

  if(canMorph){
    swatch.style.viewTransitionName='product-hero-image';
    const vt=document.startViewTransition(function(){
      openIt();
      swatch.style.viewTransitionName='';
      pack.style.viewTransitionName='product-hero-image';
    });
    scrollIn();
    vt.finished.finally(function(){ pack.style.viewTransitionName=''; });
  } else {
    openIt(); scrollIn();
  }
}
function stepProduct(dir){
  const n=(PRODUCTS[activeCat]||[]).length;
  if(!n) return;
  prodIndex=(prodIndex+dir+n)%n;
  renderDetail(true);
}

/* staggered reveal: fades/lifts a list of elements in sequence rather than all at once */
function staggerReveal(els, stepMs){
  els.forEach(function(el,i){
    if(!el) return;
    el.classList.remove('in');
    el.classList.add('reveal');
    el.style.transitionDelay=(i*stepMs)+'ms';
  });
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      els.forEach(function(el){ if(el) el.classList.add('in'); });
    });
  });
}

/* shared: paint a product photo (or a neutral placeholder when none uploaded yet)
   into a .detail-pack/.pf-pack element */
function applyPackPhoto(pack, packNameEl, p){
  pack.classList.remove('no-photo');
  if(p.photo_url){
    pack.style.backgroundImage = "url('"+p.photo_url+"')";
    pack.style.backgroundSize = 'contain';
    pack.style.backgroundRepeat = 'no-repeat';
    pack.style.backgroundPosition = 'center';
    if(packNameEl) packNameEl.textContent = '';
  } else {
    pack.style.backgroundImage = '';
    pack.classList.add('no-photo');
    if(packNameEl) packNameEl.textContent = p['name_'+lang];
  }
}

function renderDetail(crossfade, stagger){
  const pack=document.getElementById('d-pack'), body=document.getElementById('detail-body');
  const list = PRODUCTS[activeCat] || [];
  if(!list.length) return;
  const paint=function(){
    const p=list[prodIndex];
    const sec=SECTIONS.find(function(s){ return s.slug===activeCat; });
    document.getElementById('d-cat').textContent=sec ? sec['name_'+lang] : '';
    document.getElementById('d-name').textContent=p['name_'+lang];
    document.getElementById('d-blend').textContent=variantsText(p);
    document.getElementById('d-desc').textContent=p['description_'+lang] || '';
    document.getElementById('d-btn').textContent=T[lang].viewProduct;
    applyPackPhoto(pack, document.getElementById('d-packname'), p);
    const dots=document.getElementById('d-dots'); dots.innerHTML='';
    list.forEach((_,i)=>{const b=document.createElement('button');b.className=(i===prodIndex?'on':'')+' tap';b.setAttribute('aria-label','item '+(i+1));b.onclick=function(e){e.stopPropagation();prodIndex=i;renderDetail(true);};dots.appendChild(b);});
    pack.classList.remove('fade'); body.classList.remove('fade');
    if(stagger){
      staggerReveal([
        document.getElementById('d-cat'),
        document.getElementById('d-name'),
        document.getElementById('d-blend'),
        document.getElementById('d-desc'),
        document.querySelector('#detail .detail-foot'),
        document.getElementById('d-dots')
      ], 70);
    }
  };
  if(crossfade){
    pack.classList.add('fade'); body.classList.add('fade');
    setTimeout(paint,140);
  } else { paint(); }
}

/* ---------- swipe gestures (mobile-first) ---------- */
function attachSwipe(el, onLeft, onRight){
  let sx=0, sy=0, tracking=false;
  el.addEventListener('touchstart', function(e){
    if(!e.touches || !e.touches[0]) return;
    sx=e.touches[0].clientX; sy=e.touches[0].clientY; tracking=true;
  }, {passive:true});
  el.addEventListener('touchend', function(e){
    if(!tracking) return; tracking=false;
    const t=(e.changedTouches && e.changedTouches[0]) || null;
    if(!t) return;
    const dx=t.clientX-sx, dy=t.clientY-sy;
    if(Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)*1.4){
      if(dx < 0) onLeft(); else onRight();
    }
  }, {passive:true});
}

/* dedicated single-product page with a real, clean URL path, e.g. /coffee/blend-6
   (pushState changes never reload the page) */
function openProductPage(cat,slug,fromUI,push){
  const list = PRODUCTS[cat] || [];
  const idx=list.findIndex(function(p){return p.slug===slug;});
  if(idx<0) return;
  if(fromUI){ lastCat=activeCat; lastIndex=prodIndex; }

  const sourcePack=document.getElementById('d-pack');
  const destPack=document.getElementById('pf-pack');
  const detailOpen = !document.getElementById('detail').classList.contains('hidden');
  const canMorph = !!(fromUI && document.startViewTransition && sourcePack && detailOpen);

  const doNav=function(){
    activeCat=cat; prodIndex=idx; setAccent(cat);
    renderProductPage(false, true);
    go('product', {push:false});
    if(push!==false){
      try{ history.pushState({view:'product',cat:cat,slug:slug}, '', withBase('/'+cat+'/'+slug)); }catch(e){}
    }
    updateSEO('/'+cat+'/'+slug, list[idx]['name_'+lang]);
  };

  if(canMorph){
    sourcePack.style.viewTransitionName='product-hero-image';
    const vt=document.startViewTransition(function(){
      doNav();
      sourcePack.style.viewTransitionName='';
      destPack.style.viewTransitionName='product-hero-image';
    });
    vt.finished.finally(function(){ destPack.style.viewTransitionName=''; });
  } else {
    doNav();
  }
}
function renderProductPage(crossfade, stagger){
  const pack=document.getElementById('pf-pack'), body=document.getElementById('pf-body');
  const list = PRODUCTS[activeCat] || [];
  const p = list[prodIndex];
  if(!p) return;
  const paint=function(){
    const sec=SECTIONS.find(function(s){ return s.slug===activeCat; });
    document.getElementById('pf-cat').textContent=sec ? sec['name_'+lang] : '';
    document.getElementById('pf-name').textContent=p['name_'+lang];
    document.getElementById('pf-blend').textContent=variantsText(p);
    document.getElementById('pf-desc').textContent=p['description_'+lang] || '';
    applyPackPhoto(pack, document.getElementById('pf-packname'), p);
    pack.classList.remove('fade'); body.classList.remove('fade');
    if(stagger){
      staggerReveal([
        document.getElementById('pf-cat'),
        document.getElementById('pf-name'),
        document.getElementById('pf-blend'),
        document.getElementById('pf-desc')
      ], 80);
    }
  };
  if(crossfade){ pack.classList.add('fade'); body.classList.add('fade'); setTimeout(paint,140); }
  else { paint(); }
}
function stepProductPage(dir){
  const list = PRODUCTS[activeCat] || [];
  const n = list.length;
  if(!n) return;
  prodIndex=(prodIndex+dir+n)%n;
  const slug=list[prodIndex].slug;
  renderProductPage(true);
  try{ history.pushState({view:'product',cat:activeCat,slug:slug}, '', withBase('/'+activeCat+'/'+slug)); }catch(e){}
  updateSEO('/'+activeCat+'/'+slug, list[prodIndex]['name_'+lang]);
}
function closeProductPage(){
  activateCategory(lastCat||'coffee', {scroll:false});
  prodIndex=lastIndex||0;
  insertDetailAfterRow(prodIndex);
  document.getElementById('detail').classList.remove('hidden');
  renderDetail(false);
  go('home');
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      document.getElementById('detail').scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
}
function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function parseAndApplyRoute(path, push){
  path = (path||'/').replace(/\/+$/,'') || '/';
  path = stripBase(path);
  const catSlugs = SECTIONS.map(function(s){ return s.slug; });
  if(catSlugs.length){
    const prodRe = new RegExp('^/('+catSlugs.map(escapeRegex).join('|')+')/([a-z0-9-]+)$');
    const prodMatch = path.match(prodRe);
    if(prodMatch){ openProductPage(prodMatch[1], prodMatch[2], false, false); return true; }
  }
  const blogMatch = path.match(/^\/blog\/([a-z0-9-]+)$/);
  if(blogMatch && BLOG.some(function(p){return p.slug===blogMatch[1];})){ openArticle(blogMatch[1], false); return true; }
  const map={'':'home','/':'home','/blog':'blog','/about':'about','/contact':'contact','/privacy':'privacy','/terms':'terms'};
  const view = map[path];
  if(view){ go(view, {push:push!==false}); return true; }
  return false;
}

function renderBlog(){
  const g=document.getElementById('blog-grid'); g.innerHTML='';
  if(!BLOG.length){
    g.innerHTML = '<p class="empty-note">'+esc(T[lang].emptyBlog)+'</p>';
    return;
  }
  BLOG.forEach((p,i)=>{
    const el=document.createElement('article');el.className='post reveal';el.style.transitionDelay=(i*35)+'ms';el.onclick=()=>openArticle(p.slug);
    const coverStyle = p.cover_photo_url ? "background-size:cover;background-position:center;" : '';
    const coverClass = 'cover'+(p.cover_photo_url ? '' : ' no-photo');
    el.innerHTML='<div class="'+coverClass+'" style="'+coverStyle+'"></div><div class="body"><div class="date">'+esc(formatBlogDate(p.published_at))+'</div><h3>'+esc(p['title_'+lang])+'</h3></div>';
    g.appendChild(el);
    if(p.cover_photo_url){ lazyBackground(el.querySelector('.cover'), p.cover_photo_url); }
  });
  observeReveal(g);
}
function openArticle(slug, push){
  currentArticle=slug; renderArticle(); go('article', {push:false});
  if(push!==false){
    try{ history.pushState({view:'article',slug:slug}, '', withBase('/blog/'+slug)); }catch(e){}
  }
  const p=BLOG.find(function(x){return x.slug===slug;});
  if(p) updateSEO('/blog/'+slug, p['title_'+lang]);
}
function renderArticle(){
  if(!currentArticle)return;
  const p=BLOG.find(x=>x.slug===currentArticle);
  if(!p) return;
  const coverStyle = p.cover_photo_url ? "background-image:url('"+p.cover_photo_url+"');background-size:cover;background-position:center;" : '';
  const coverClass = 'cover'+(p.cover_photo_url ? '' : ' no-photo');
  const bodyHtml = DOMPurify.sanitize(p['body_'+lang] || '');
  document.getElementById('article-body').innerHTML =
    '<span class="back" onclick="go(\'blog\')"><span class="arrow-move">←</span> '+esc(T[lang].back)+'</span>'+
    '<h1 style="margin-top:12px">'+esc(p['title_'+lang])+'</h1>'+
    '<div class="date">'+esc(formatBlogDate(p.published_at))+'</div>'+
    '<div class="'+coverClass+'" style="'+coverStyle+'"></div>'+
    '<div class="article-content">'+bodyHtml+'</div>';
  // inline body images are real <img> tags (from sanitized rich-text HTML),
  // not background-image divs - native loading="lazy" is the right tool here
  // rather than lazyBackground(), which only applies to the latter.
  document.querySelectorAll('#article-body .article-content img').forEach(function(img){
    img.loading = 'lazy';
  });
}

/* ---------- contact info (email only) + form ---------- */
function renderContactInfo(){
  if(!CONTACT) return;
  const emailEl = document.getElementById('contact-email');
  if(emailEl){
    emailEl.textContent = CONTACT.email || '';
    emailEl.href = 'mailto:' + (CONTACT.email || '');
  }
}

/* ---------- contact locations: shared between the footer and the Contact page ----------
   Same markup (.foot-block/.foot-line) in both places - the Contact page scopes it
   under .contact-locations, which overrides the (otherwise footer-only, dark-on-dark)
   text colors for a light background. See styles.css. */
function locationBlockHtml(loc){
  const heading = esc(loc['label_'+lang]);
  const addressText = loc['address_'+lang] || '';
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
function renderLocationsHTML(locations, includeEmailInFirstBlock){
  if(!locations.length) return '';
  return locations.map(function(loc, i){
    let html = locationBlockHtml(loc);
    if(includeEmailInFirstBlock && i === 0 && CONTACT && CONTACT.email){
      const emailLine = '<a class="foot-line" href="mailto:' + esc(CONTACT.email) + '">' + esc(CONTACT.email) + '</a>';
      html = html.slice(0, -6) + emailLine + '</div>'; // insert before the closing </div>
    }
    return html;
  }).join('');
}
function renderContactLocations(){
  const footerEl = document.getElementById('footer-locations');
  if(footerEl) footerEl.innerHTML = renderLocationsHTML(LOCATIONS, true);
  const pageEl = document.getElementById('contact-locations');
  if(pageEl) pageEl.innerHTML = renderLocationsHTML(LOCATIONS, false);
}
async function handleContactSubmit(e){
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const name = document.getElementById('cfName').value.trim();
  const email = document.getElementById('cfEmail').value.trim();
  const message = document.getElementById('cfMessage').value.trim();
  if(!name || !email || !message) return;
  btn.disabled = true;
  try{
    const { error } = await sb.from('contact_messages').insert({ name, email, message });
    if(error) throw error;
    form.reset();
    alert(T[lang].sent);
  }catch(err){
    alert(lang==='ka' ? 'შეტყობინების გაგზავნა ვერ მოხერხდა, სცადეთ თავიდან.' : 'Could not send the message, please try again.');
  }finally{
    btn.disabled = false;
  }
}

/* ---------- about page ---------- */
function renderAboutPage(){
  if(!ABOUT) return;
  const titleEl = document.getElementById('about-title');
  if(titleEl) titleEl.textContent = ABOUT['title_'+lang] || T[lang].aboutTitle;
  const bodyEl = document.getElementById('about-body');
  if(bodyEl) bodyEl.textContent = ABOUT['body_'+lang] || '';
}

window.addEventListener('popstate', function(){
  parseAndApplyRoute(location.pathname, false);
});

(async function init(){
  document.querySelectorAll('[data-base-src]').forEach(function(el){
    el.src = withBase(el.getAttribute('data-base-src'));
  });
  await fetchSiteData();
  if(SECTIONS.length){ activeCat = SECTIONS.some(function(s){ return s.slug===activeCat; }) ? activeCat : SECTIONS[0].slug; }
  renderCategoryButtons();
  renderHero();
  startHeroRotation();
  initTheme();
  initCookieBar();
  document.getElementById('ka').classList.add('active');
  if(SECTIONS.length) activateCategory(activeCat, {scroll:false});
  const matched = parseAndApplyRoute(location.pathname, false);
  if(!matched){ go('home', {push:false}); }
  renderText(); renderBlog();
  renderContactInfo(); renderContactLocations(); renderAboutPage();
  attachSwipe(document.getElementById('detail-media'), function(){stepProduct(1);}, function(){stepProduct(-1);});
  attachSwipe(document.getElementById('pf-grid'), function(){stepProductPage(1);}, function(){stepProductPage(-1);});
  attachSwipe(document.getElementById('hero'), function(){heroStep(1);}, function(){heroStep(-1);});
  const heroEl = document.getElementById('hero');
  if(heroEl){
    heroEl.addEventListener('mouseenter', function(){ clearInterval(heroTimer); });
    heroEl.addEventListener('mouseleave', function(){ startHeroRotation(); });
  }
})();
