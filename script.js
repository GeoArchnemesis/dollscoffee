const DATA = {
  coffee:{products:[
    {slug:'blend-6',short:'BLEND 6',c:'#2E5A46',c2:'#1E3B67',name:{ka:'ესპრესო 100% არაბიკა · Blend 6',en:'Espresso 100% Arabica · Blend 6'},spec:{ka:'1კგ',en:'1kg'},desc:{ka:'',en:''}},
    {slug:'blend-9c',short:'BLEND 9C',c:'#7A2E43',c2:'#C77088',name:{ka:'ესპრესო 100% არაბიკა · Blend 9C',en:'Espresso 100% Arabica · Blend 9C'},spec:{ka:'1კგ',en:'1kg'},desc:{ka:'',en:''}},
    {slug:'blend-12',short:'BLEND 12',c:'#7E2D22',c2:'#43264A',name:{ka:'ესპრესო 100% არაბიკა · Blend 12',en:'Espresso 100% Arabica · Blend 12'},spec:{ka:'1კგ',en:'1kg'},desc:{ka:'',en:''}},
    {slug:'decaf',short:'DECAF',c:'#6B4A3A',c2:'#3E2A20',name:{ka:'ესპრესო უკოფეინო · Decaf',en:'Espresso Decaf'},spec:{ka:'250გ',en:'250g'},desc:{ka:'',en:''}},
    {slug:'greek-aristos',short:'GREEK',c:'#C99A3C',c2:'#8A6420',name:{ka:'ბერძნული ყავა · ღია მოხალვა «Aristos»',en:'Greek Coffee · Blonde “Aristos”'},spec:{ka:'500გ',en:'500g'},desc:{ka:'',en:''}},
    {slug:'colombia',short:'COLOMBIA',c:'#5A3A28',c2:'#2E1D14',name:{ka:'ფილტრის ყავა · Colombia',en:'Filter Coffee · Colombia'},spec:{ka:'',en:''},desc:{ka:'',en:''}}
  ]},
  chocolate:{products:[
    {slug:'hazelnut',short:'HAZELNUT',c:'#C77FB0',c2:'#2C3E8C',name:{ka:'თხილი · Chocolulu',en:'Hazelnut · Chocolulu'},spec:{ka:'400გ',en:'400g'},desc:{ka:'',en:''}},
    {slug:'salted-caramel',short:'SALTED CARAMEL',c:'#E39A2C',c2:'#1F7A82',name:{ka:'მარილიანი კარამელი · Chocolulu',en:'Salted Caramel · Chocolulu'},spec:{ka:'400გ',en:'400g'},desc:{ka:'',en:''}},
    {slug:'banana',short:'BANANA',c:'#E0651F',c2:'#5A3620',name:{ka:'არაქისის კარაქი & ბანანი · Chocolulu',en:'Peanut Butter Banana · Chocolulu'},spec:{ka:'400გ',en:'400g'},desc:{ka:'',en:''}},
    {slug:'strawberry',short:'STRAWBERRY',c:'#7CC63A',c2:'#7B3FA0',name:{ka:'მარწყვი · Chocolulu',en:'Strawberry · Chocolulu'},spec:{ka:'400გ',en:'400g'},desc:{ka:'',en:''}},
    {slug:'lemon-pie',short:'LEMON PIE',c:'#3FA9E0',c2:'#2E8B3C',name:{ka:'ლიმონის ღვეზელი · Chocolulu',en:'Lemon Pie · Chocolulu'},spec:{ka:'400გ',en:'400g'},desc:{ka:'',en:''}},
    {slug:'golden',short:'GOLDEN',c:'#D98A2B',c2:'#B4472B',name:{ka:'Golden · Chocolulu',en:'Golden · Chocolulu'},spec:{ka:'1კგ',en:'1kg'},desc:{ka:'',en:''}},
    {slug:'white',short:'WHITE',c:'#D98C93',c2:'#B0616B',name:{ka:'White · Chocolulu',en:'White · Chocolulu'},spec:{ka:'1კგ',en:'1kg'},desc:{ka:'',en:''}},
    {slug:'cool-mocha',short:'COOL MOCHA',c:'#6F4A34',c2:'#3A2418',name:{ka:'Cool Mocha Choc',en:'Cool Mocha Choc'},spec:{ka:'1კგ',en:'1kg'},desc:{ka:'',en:''}}
  ]},
  tea:{products:[
    {slug:'earl-grey',short:'EARL GREY',c:'#8C8A97',c2:'#5A5866',name:{ka:'ერლ გრეი',en:'Earl Grey'},spec:{ka:'15 ც',en:'15 pcs'},desc:{ka:'',en:''}},
    {slug:'jasmine',short:'JASMINE',c:'#B7C24A',c2:'#8DA02F',name:{ka:'ჟასმინი',en:'Jasmine'},spec:{ka:'15 ც',en:'15 pcs'},desc:{ka:'',en:''}},
    {slug:'summer-fruits',short:'SUMMER FRUITS',c:'#D5657F',c2:'#A23F5A',name:{ka:'საზაფხულო ხილი',en:'Summer Fruits'},spec:{ka:'15 ც',en:'15 pcs'},desc:{ka:'',en:''}},
    {slug:'green-tea',short:'GREEN TEA',c:'#5FA33F',c2:'#3B6E27',name:{ka:'მწვანე ჩაი',en:'Green Tea'},spec:{ka:'15 ც',en:'15 pcs'},desc:{ka:'',en:''}},
    {slug:'camomile',short:'CAMOMILE',c:'#E0C36A',c2:'#C99A3C',name:{ka:'გვირილა',en:'Pure Camomile'},spec:{ka:'15 ც',en:'15 pcs'},desc:{ka:'',en:''}},
    {slug:'peppermint',short:'PEPPERMINT',c:'#2E8B9E',c2:'#1C5966',name:{ka:'პიტნა',en:'Peppermint'},spec:{ka:'15 ც',en:'15 pcs'},desc:{ka:'',en:''}},
    {slug:'english-breakfast',short:'ENGLISH BREAKFAST',c:'#4A6FA5',c2:'#2E4468',name:{ka:'English Breakfast',en:'English Breakfast'},spec:{ka:'',en:''},desc:{ka:'',en:''}},
    {slug:'gunpowder',short:'GUNPOWDER',c:'#3E6B4F',c2:'#233E2C',name:{ka:'მწვანე «China Gunpowder»',en:'Green “China Gunpowder”'},spec:{ka:'',en:''},desc:{ka:'',en:''}},
    {slug:'vanilla',short:'VANILLA',c:'#D8C39A',c2:'#A8895E',name:{ka:'ვანილი',en:'Vanilla'},spec:{ka:'',en:''},desc:{ka:'',en:''}},
    {slug:'apple-ginger',short:'APPLE-GINGER',c:'#D2622E',c2:'#8A3A18',name:{ka:'ვაშლი-ჯანჯაფილი',en:'Apple-Ginger'},spec:{ka:'დაბალი მჟავიანობა',en:'Low acid'},desc:{ka:'',en:''}},
    {slug:'spiced-chai',short:'SPICED CHAI',c:'#C0392B',c2:'#7C2318',name:{ka:'სანელებლიანი ჩაი',en:'Spiced Chai'},spec:{ka:'250გ',en:'250g'},desc:{ka:'',en:''}}
  ]}
};
const T = {
  ka:{home:'მთავარი',blog:'ბლოგი',contact:'კონტაქტი',coffee:'ყავა',chocolate:'შოკოლადი',tea:'ჩაი',viewProduct:'პროდუქტის დეტალები',
    swipeHint:'გადაფურცლე ←→',
    blogEyebrow:'ჟურნალი',blogTitle:'ბლოგი',contactEyebrow:'დაგვიკავშირდი',contactTitle:'კონტაქტი',
    phone:'ტელეფონი',address:'მისამართი',addressVal:'თბილისი, საქართველო',partnerK:'პარტნიორი',
    fName:'სახელი',fEmail:'ელ. ფოსტა',fMsg:'შეტყობინება',fSend:'გაგზავნა',sent:'მადლობა! შეტყობინება გაიგზავნა (დემო).',back:'უკან ბლოგზე',
    priv:'კონფიდენციალურობის პოლიტიკა',terms:'გამოყენების წესები',rights:'ყველა უფლება დაცულია',
    privTitle:'კონფიდენციალურობის პოლიტიკა',privLead:'',privP1:'',termsTitle:'გამოყენების წესები',termsLead:'',termsP1:'',viewFull:'სრული დოკუმენტის ნახვა →',
    cookieText:'საიტი იყენებს cookie-ებს გამოცდილების გასაუმჯობესებლად.',cookieAccept:'კარგი',cookieDecline:'უარყოფა'},
  en:{home:'Home',blog:'Blog',contact:'Contact',coffee:'Coffee',chocolate:'Chocolate',tea:'Tea',viewProduct:'Product details',
    swipeHint:'swipe ←→',
    blogEyebrow:'Journal',blogTitle:'The Blog',contactEyebrow:'Get in touch',contactTitle:'Contact',
    phone:'Phone',address:'Address',addressVal:'Tbilisi, Georgia',partnerK:'Partner',
    fName:'Name',fEmail:'Email',fMsg:'Message',fSend:'Send message',sent:'Thank you! Your message was sent (demo).',back:'Back to blog',
    priv:'Privacy Policy',terms:'Terms of use',rights:'All Rights Reserved',
    privTitle:'Privacy Policy',privLead:'',privP1:'',termsTitle:'Terms of use',termsLead:'',termsP1:'',viewFull:'View full document →',
    cookieText:'This site uses cookies to improve your experience.',cookieAccept:'Got it',cookieDecline:'Decline'}
};
const POSTS = [
  {id:'p1',cat:{ka:'ყავა',en:'Coffee'},c:'#B4472B',c2:'#5F2A1B',date:{ka:'',en:''},title:{ka:'ბლოგის სათაური',en:'Post title'},body:{ka:[''],en:['']}},
  {id:'p2',cat:{ka:'ჩაი',en:'Tea'},c:'#3E6B4F',c2:'#233E2C',date:{ka:'',en:''},title:{ka:'ბლოგის სათაური',en:'Post title'},body:{ka:[''],en:['']}},
  {id:'p3',cat:{ka:'შოკოლადი',en:'Chocolate'},c:'#C63A2F',c2:'#5A2620',date:{ka:'',en:''},title:{ka:'ბლოგის სათაური',en:'Post title'},body:{ka:[''],en:['']}}
];

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
    else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){ t='dark'; }
  }catch(e){}
  applyTheme(t);
}

/* ---------- mobile menu ---------- */
function toggleMenu(){
  const menu=document.getElementById('menu'), btn=document.getElementById('burgerBtn');
  const open = !menu.classList.contains('open');
  menu.classList.toggle('open', open);
  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
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
  if(document.startViewTransition){ document.startViewTransition(fn); } else { fn(); }
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
  },{threshold:.12, rootMargin:'0px 0px -40px 0px'});
}
function observeReveal(container){
  initReveal();
  if(!revealObserver){ container.querySelectorAll('.reveal').forEach(el=>el.classList.add('in')); return; }
  container.querySelectorAll('.reveal:not(.in)').forEach(el=>revealObserver.observe(el));
}

/* ---------- language ----------
   NOTE: earlier versions tried to rewrite the URL path (e.g. appending /ka or /en)
   using history.replaceState. On a static single HTML file this produces an
   invalid path like ".../dollscoffee.html/ka", which the browser cannot resolve
   and effectively reloads/breaks navigation. Language switching is UI-only here;
   it never touches the URL. (A real multi-page build, e.g. Astro, would serve
   /ka and /en as actual routes instead.) */
function setLang(l){
  lang=l; document.documentElement.lang=l;
  document.getElementById('ka').classList.toggle('active',l==='ka');
  document.getElementById('en').classList.toggle('active',l==='en');
  renderText();
  renderProdList();
  if(!document.getElementById('detail').classList.contains('hidden')) renderDetail(true);
  if(currentView==='product') renderProductPage(true);
  renderBlog(); renderArticle();
}
function renderText(){
  document.querySelectorAll('[data-t]').forEach(el=>{const v=T[lang][el.dataset.t];if(v!==undefined)el.textContent=v;});
  document.querySelectorAll('[data-nav]').forEach(a=>{a.textContent=T[lang][a.dataset.nav];a.classList.toggle('active',a.dataset.nav===currentView);});
}
function go(view){
  const doIt=function(){
    currentView=view;
    ['home','blog','contact','article','privacy','terms','product'].forEach(v=>document.getElementById('page-'+v).classList.toggle('show',v===view));
    document.getElementById('menu').classList.remove('open');
    document.getElementById('burgerBtn').classList.remove('open');
    document.getElementById('burgerBtn').setAttribute('aria-expanded','false');
    document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===view));
  };
  withTransition(doIt);
}
function setAccent(cat){
  const map={coffee:['--coffee','--coffee-deep','--coffee-soft'],chocolate:['--choc','--choc-deep','--choc-soft'],tea:['--tea','--tea-deep','--tea-soft']};
  const a=map[cat][0],d=map[cat][1],s=map[cat][2],r=document.documentElement.style;
  r.setProperty('--accent','var('+a+')');r.setProperty('--accent-deep','var('+d+')');r.setProperty('--accent-soft','var('+s+')');
}
function activateCategory(cat, opts){
  opts = opts || {};
  activeCat=cat; setAccent(cat);
  document.querySelectorAll('.cat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===cat));
  document.getElementById('detail').classList.add('hidden');
  renderProdList();
  if(opts.scroll) setTimeout(()=>document.getElementById('list-section').scrollIntoView({behavior:'smooth'}),40);
}
function renderProdList(){
  const wrap=document.getElementById('prod-list'); wrap.innerHTML='';
  DATA[activeCat].products.forEach((p,i)=>{
    const card=document.createElement('button'); card.className='prod-card tap reveal'; card.style.transitionDelay=(Math.min(i,10)*35)+'ms'; card.onclick=()=>selectProduct(i);
    card.innerHTML='<span class="swatch" style="background:linear-gradient(150deg,'+p.c+','+p.c2+')"><span class="badge">New</span><span class="code">'+p.short+'</span></span>'
      +'<span class="rname">'+p.name[lang]+'</span>'
      +'<span class="row-bottom"><span class="rspec">'+p.spec[lang]+'</span>'
      +'<svg class="ico chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>';
    wrap.appendChild(card);
  });
  observeReveal(wrap);
}
function selectProduct(i){
  prodIndex=i;
  document.getElementById('detail').classList.remove('hidden');
  renderDetail(false);
  setTimeout(()=>document.getElementById('detail').scrollIntoView({behavior:'smooth'}),50);
}
function stepProduct(dir){const n=DATA[activeCat].products.length;prodIndex=(prodIndex+dir+n)%n;renderDetail(true);}
function renderDetail(crossfade){
  const pack=document.getElementById('d-pack'), body=document.getElementById('detail-body');
  const paint=function(){
    const p=DATA[activeCat].products[prodIndex];
    document.getElementById('d-cat').textContent=T[lang][activeCat];
    document.getElementById('d-name').textContent=p.name[lang];
    document.getElementById('d-blend').textContent=p.spec[lang];
    document.getElementById('d-desc').textContent=p.desc[lang];
    document.getElementById('d-btn').textContent=T[lang].viewProduct;
    pack.style.background='linear-gradient(150deg,'+p.c+','+p.c2+')';
    document.getElementById('d-packname').textContent=p.short;
    const dots=document.getElementById('d-dots'); dots.innerHTML='';
    DATA[activeCat].products.forEach((_,i)=>{const b=document.createElement('button');b.className=(i===prodIndex?'on':'')+' tap';b.setAttribute('aria-label','item '+(i+1));b.onclick=()=>{prodIndex=i;renderDetail(true);};dots.appendChild(b);});
    pack.classList.remove('fade'); body.classList.remove('fade');
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

/* dedicated single-product page with hash-based route, e.g. #/coffee/blend-6
   (hash changes never reload the page, unlike the old pathname approach) */
function openProductPage(cat,slug,fromUI){
  const idx=DATA[cat].products.findIndex(function(p){return p.slug===slug;});
  if(idx<0) return;
  if(fromUI){ lastCat=activeCat; lastIndex=prodIndex; }
  activeCat=cat; prodIndex=idx; setAccent(cat);
  renderProductPage(false);
  go('product');
  try{ location.hash = '#/'+cat+'/'+slug; }catch(e){}
  window.scrollTo({top:0});
}
function renderProductPage(crossfade){
  const pack=document.getElementById('pf-pack'), body=document.getElementById('pf-body');
  const paint=function(){
    const p=DATA[activeCat].products[prodIndex];
    document.getElementById('pf-cat').textContent=T[lang][activeCat];
    document.getElementById('pf-name').textContent=p.name[lang];
    document.getElementById('pf-blend').textContent=p.spec[lang];
    document.getElementById('pf-desc').textContent=p.desc[lang];
    pack.style.background='linear-gradient(150deg,'+p.c+','+p.c2+')';
    document.getElementById('pf-packname').textContent=p.short;
    pack.classList.remove('fade'); body.classList.remove('fade');
  };
  if(crossfade){ pack.classList.add('fade'); body.classList.add('fade'); setTimeout(paint,140); }
  else { paint(); }
}
function stepProductPage(dir){
  const n=DATA[activeCat].products.length;
  prodIndex=(prodIndex+dir+n)%n;
  const slug=DATA[activeCat].products[prodIndex].slug;
  renderProductPage(true);
  try{ location.hash='#/'+activeCat+'/'+slug; }catch(e){}
}
function closeProductPage(){
  try{ history.replaceState({},'',location.pathname+location.search); }catch(e){}
  activateCategory(lastCat||'coffee', {scroll:false});
  prodIndex=lastIndex||0;
  document.getElementById('detail').classList.remove('hidden');
  renderDetail(false);
  go('home');
  setTimeout(()=>document.getElementById('detail').scrollIntoView({behavior:'smooth'}),50);
}
function tryOpenFromHash(){
  const m=location.hash.match(/^#\/(coffee|chocolate|tea)\/([a-z0-9-]+)$/);
  if(m){ openProductPage(m[1], m[2], false); return true; }
  return false;
}

function renderBlog(){
  const g=document.getElementById('blog-grid'); g.innerHTML='';
  POSTS.forEach((p,i)=>{const el=document.createElement('article');el.className='post reveal';el.style.transitionDelay=(i*60)+'ms';el.onclick=()=>openArticle(p.id);
    el.innerHTML='<div class="cover" style="background:linear-gradient(135deg,'+p.c+','+p.c2+')"><span class="tag">'+p.cat[lang]+'</span></div><div class="body"><div class="date">'+p.date[lang]+'</div><h3>'+p.title[lang]+'</h3></div>';
    g.appendChild(el);});
  observeReveal(g);
}
function openArticle(id){currentArticle=id;renderArticle();go('article');}
function renderArticle(){
  if(!currentArticle)return;
  const p=POSTS.find(x=>x.id===currentArticle);
  document.getElementById('article-body').innerHTML='<span class="back" onclick="go(\'blog\')">← '+T[lang].back+'</span><div style="text-transform:uppercase;letter-spacing:.22em;font-size:12px;font-weight:600;color:'+p.c+';font-family:var(--sans)">'+p.cat[lang]+'</div><h1 style="margin-top:12px">'+p.title[lang]+'</h1><div class="date">'+p.date[lang]+'</div><div class="cover" style="background:linear-gradient(135deg,'+p.c+','+p.c2+')"></div>'+p.body[lang].map(function(par){return '<p style="font-family:var(--sans);color:#3d3128;margin:18px 0;font-size:18px">'+par+'</p>';}).join('');
}

window.addEventListener('hashchange', function(){
  if(location.hash===''){
    if(currentView==='product') closeProductPage();
  } else {
    tryOpenFromHash();
  }
});

(function init(){
  initTheme();
  initCookieBar();
  document.getElementById('ka').classList.add('active');
  const hasProduct = tryOpenFromHash();
  if(!hasProduct){
    activateCategory('coffee', {scroll:false});
    go('home');
  }
  renderText(); renderBlog();
  attachSwipe(document.getElementById('detail-media'), function(){stepProduct(1);}, function(){stepProduct(-1);});
  attachSwipe(document.getElementById('pf-grid'), function(){stepProductPage(1);}, function(){stepProductPage(-1);});
  document.querySelectorAll('.selector .cat-btn').forEach((el,i)=>{el.classList.add('reveal');el.style.transitionDelay=(i*70)+'ms';});
  observeReveal(document.querySelector('.selector'));
})();
