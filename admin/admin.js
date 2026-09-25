/* Doll's Coffee — Admin panel logic. Vanilla JS, no build step.
   Relies on `sb` (created in config.js) and the schema/RLS/RPCs
   set up via the SQL scripts run in the Supabase SQL Editor. */

function $(sel, root){ return (root || document).querySelector(sel); }
function $all(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
function esc(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
function slugify(str){
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function wireSlugAutoFill(nameInput, slugInput, alreadyTouched){
  const state = { touched: !!alreadyTouched };
  slugInput.addEventListener('input', function(){ state.touched = true; });
  nameInput.addEventListener('input', function(){
    if (state.touched) return;
    slugInput.value = slugify(nameInput.value);
  });
  return state;
}
function unitLabel(unit){
  if (unit === 'kg') return 'კგ';
  if (unit === 'pcs') return ' ცალი';
  return 'გრ';
}
function friendlyError(err){
  const msg = (err && err.message) || String(err);
  if (msg.indexOf('duplicate key value') !== -1) return 'ეს slug უკვე გამოყენებულია — აირჩიე სხვა.';
  if (msg.indexOf('violates foreign key constraint') !== -1) return 'ამ ჩანაწერს სხვა მონაცემი აქვს მიბმული — ჯერ ის მოაცილე.';
  return msg;
}

let sections = [];
let products = [];
let heroSlides = [];
let blogPosts = [];
let contactInfo = null;
let aboutPageData = null;
let contactMessages = [];
let contactLocations = [];
let heroSortable = null;
let sectionsSortable = null;
let productsSortable = null;
let newSectionSlugState = null;
let quillKa = null;
let quillEn = null;

/* ---------- auth ---------- */
function showLogin(errorMsg){
  $('#view-dashboard').hidden = true;
  $('#view-login').hidden = false;
  if (errorMsg) showLoginError(errorMsg); else hideLoginError();
}
function showDashboard(){
  $('#view-login').hidden = true;
  $('#view-dashboard').hidden = false;
}
function showLoginError(msg){
  const el = $('#loginError');
  el.textContent = msg;
  el.hidden = false;
}
function hideLoginError(){ $('#loginError').hidden = true; }

async function checkAuth(){
  const { data } = await sb.auth.getSession();
  if (!data.session) { showLogin(); return; }
  const { data: isAdmin, error } = await sb.rpc('am_i_admin');
  if (error) { showLogin('შემოწმების შეცდომა: ' + error.message); return; }
  if (!isAdmin) {
    await sb.auth.signOut();
    showLogin('ეს ანგარიში არ არის რეგისტრირებული როგორც ადმინი.');
    return;
  }
  showDashboard();
  await loadAll();
}

async function handleLogin(e){
  e.preventDefault();
  hideLoginError();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    if (!email || !password) {
      showLoginError('შეავსე ელ. ფოსტა და პაროლი');
      return;
    }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { showLoginError('შესვლა ვერ მოხერხდა: ' + error.message); return; }
    await checkAuth();
  } finally {
    btn.disabled = false;
  }
}
async function handleLogout(){
  await sb.auth.signOut();
  showLogin();
}

/* ---------- images: compress in-browser, then upload ---------- */

/* decode the file to a <canvas>, scaled to fit maxWidth×maxHeight (never
   upscaling). Prefers createImageBitmap with imageOrientation:'from-image'
   so EXIF-rotated phone photos come out right-side-up; falls back to the
   old new Image() decode (no auto-rotation, but never blocks the upload)
   if createImageBitmap throws on an unusual file. */
async function decodeToCanvas(file, maxWidth, maxHeight){
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    bitmap = null;
  }
  if (bitmap) {
    const ratio = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const w = Math.round(bitmap.width * ratio);
    const h = Math.round(bitmap.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return canvas;
  }
  return new Promise(function(resolve, reject){
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function(){
      const ratio = Math.min(1, maxWidth / img.width, maxHeight / img.height);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error('სურათის წაკითხვა ვერ მოხერხდა')); };
    img.src = url;
  });
}
function canvasToWebp(canvas, quality){
  return new Promise(function(resolve, reject){
    canvas.toBlob(function(blob){
      if (!blob) { reject(new Error('სურათის დამუშავება ვერ მოხერხდა')); return; }
      resolve(blob);
    }, 'image/webp', quality);
  });
}
/* target-file-size loop: start at the highest quality and only step down if
   still over budget, stopping at the floor (0.55) even if still over -
   protects visual quality over hitting the budget exactly. */
const COMPRESS_QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55];
async function compressImage(file, maxWidth, maxHeight, targetBytes){
  const canvas = await decodeToCanvas(file, maxWidth, maxHeight);
  let blob = null;
  for (let i = 0; i < COMPRESS_QUALITY_STEPS.length; i++) {
    blob = await canvasToWebp(canvas, COMPRESS_QUALITY_STEPS[i]);
    if (!targetBytes || blob.size <= targetBytes) break;
  }
  return blob;
}

/* HEIC/HEIF: some browsers report an empty file.type for these, so check
   the extension too. Converted client-side to JPEG via heic2any (CDN,
   no build step) before entering the normal compression pipeline. */
function isHeicFile(file){
  return /image\/hei(c|f)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name || '');
}
async function convertHeicToJpeg(file){
  try {
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    return Array.isArray(result) ? result[0] : result;
  } catch (e) {
    throw new Error('HEIC ფაილის დამუშავება ვერ მოხერხდა');
  }
}

async function uploadImage(file, folder, maxW, maxH, targetBytes){
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('ფაილის ზომა არ უნდა აღემატებოდეს 20MB-ს');
  }
  if (isHeicFile(file)) {
    file = await convertHeicToJpeg(file);
  } else if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error('მხოლოდ JPEG, PNG ან WebP ფაილებია დაშვებული');
  }
  const blob = await compressImage(file, maxW, maxH, targetBytes);
  // canvas.toBlob() silently falls back to PNG if the browser can't encode
  // WebP - never upload PNG bytes under a .webp label.
  const isWebp = blob.type === 'image/webp';
  const ext = isWebp ? 'webp' : 'png';
  const contentType = isWebp ? 'image/webp' : 'image/png';
  const path = folder + '/' + crypto.randomUUID() + '.' + ext;
  const { error } = await sb.storage.from('media').upload(path, blob, { contentType: contentType, upsert: false });
  if (error) throw error;
  const { data } = sb.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}
function storagePathFromUrl(url){
  const marker = '/storage/v1/object/public/media/';
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}
async function deleteImage(url){
  const path = storagePathFromUrl(url);
  if (!path) return;
  await sb.storage.from('media').remove([path]);
}

/* ---------- shared: reorder by dragging (full re-numbering) ---------- */
async function persistOrder(table, ids){
  const results = await Promise.all(ids.map(function(id, i){
    return sb.from(table).update({ sort_order: i }).eq('id', id);
  }));
  const failed = results.find(function(r){ return r.error; });
  if (failed) { alert(friendlyError(failed.error)); return false; }
  return true;
}

/* ---------- shared: reorder by swapping sort_order (products, up/down) ---------- */
async function swapSortOrder(table, list, id, dir){
  const idx = list.findIndex(function(x){ return x.id === id; });
  const j = idx + dir;
  if (idx === -1 || j < 0 || j >= list.length) return false;
  const a = list[idx], b = list[j];
  const r1 = await sb.from(table).update({ sort_order: b.sort_order }).eq('id', a.id);
  if (r1.error) { alert(friendlyError(r1.error)); return false; }
  const r2 = await sb.from(table).update({ sort_order: a.sort_order }).eq('id', b.id);
  if (r2.error) { alert(friendlyError(r2.error)); return false; }
  return true;
}

/* ---------- load ---------- */
async function loadAll(){
  await loadSections();
  await Promise.all([loadHero(), loadProducts(), loadBlogPosts(), loadContactInfo(), loadContactLocations(), loadAboutPage(), loadMessages()]);
}
async function loadSections(){
  const { data, error } = await sb.from('sections').select('*').order('sort_order');
  if (error) { alert('სექციების ჩატვირთვის შეცდომა: ' + error.message); return; }
  sections = data || [];
  renderSections();
  renderProductSectionFilter();
}
async function loadHero(){
  const { data, error } = await sb.from('hero_slides').select('*').order('sort_order');
  if (error) { alert('Hero ფოტოების ჩატვირთვის შეცდომა: ' + error.message); return; }
  heroSlides = data || [];
  renderHero();
}
async function loadProducts(){
  const { data, error } = await sb.from('products').select('*').order('sort_order');
  if (error) { alert('პროდუქტების ჩატვირთვის შეცდომა: ' + error.message); return; }
  products = data || [];
  renderProducts();
}

/* ---------- hero ---------- */
function renderHero(){
  const root = $('#heroList');
  if (heroSortable) { heroSortable.destroy(); heroSortable = null; }
  if (!heroSlides.length) { root.innerHTML = '<p class="empty">ჯერ არცერთი ფოტო არ არის ატვირთული.</p>'; return; }
  root.innerHTML = heroSlides.map(function(s){
    return (
      '<div class="hero-card" data-id="' + s.id + '">' +
        '<img src="' + esc(s.photo_url) + '" alt="">' +
        '<div class="hero-card-link">' +
          '<input type="url" class="f-link" placeholder="ლინკი (არასავალდებულო) — მაგ. https://..." value="' + esc(s.link_url || '') + '">' +
        '</div>' +
        '<div class="hero-card-actions">' +
          '<span class="drag-handle" title="გადათრევით დალაგება">⠿</span>' +
          '<label class="toggle"><input type="checkbox" class="f-active"' + (s.is_active ? ' checked' : '') + '> აქტიური</label>' +
          '<button class="btn small danger" data-act="delete">წაშლა</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
  $all('.hero-card', root).forEach(function(card){
    const id = card.dataset.id;
    card.querySelector('.f-active').addEventListener('change', async function(e){
      const { error } = await sb.from('hero_slides').update({ is_active: e.target.checked }).eq('id', id);
      if (error) { alert(friendlyError(error)); e.target.checked = !e.target.checked; }
    });
    card.querySelector('.f-link').addEventListener('change', async function(e){
      const value = e.target.value.trim();
      const { error } = await sb.from('hero_slides').update({ link_url: value || null }).eq('id', id);
      if (error) alert(friendlyError(error));
    });
    card.querySelector('[data-act="delete"]').addEventListener('click', async function(){
      if (!confirm('წავშალო ეს ფოტო?')) return;
      const slide = heroSlides.find(function(s){ return s.id === id; });
      const { error } = await sb.from('hero_slides').delete().eq('id', id);
      if (error) { alert(friendlyError(error)); return; }
      if (slide) await deleteImage(slide.photo_url);
      await loadHero();
    });
  });
  heroSortable = Sortable.create(root, {
    handle: '.drag-handle',
    draggable: '.hero-card',
    animation: 150,
    forceFallback: true,
    onEnd: async function(){
      const ids = $all('.hero-card', root).map(function(el){ return el.dataset.id; });
      if (await persistOrder('hero_slides', ids)) await loadHero();
    }
  });
}
async function handleHeroFileChange(e){
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const url = await uploadImage(file, 'hero', 1600, 800, 280 * 1024);
    const sort_order = heroSlides.length ? Math.max.apply(null, heroSlides.map(function(s){ return s.sort_order; })) + 1 : 0;
    const { error } = await sb.from('hero_slides').insert({ photo_url: url, sort_order: sort_order, is_active: true });
    if (error) throw error;
    await loadHero();
  } catch (err) {
    alert('ატვირთვის შეცდომა: ' + friendlyError(err));
  }
}

/* ---------- sections ---------- */
function renderSections(){
  const root = $('#sectionsList');
  if (sectionsSortable) { sectionsSortable.destroy(); sectionsSortable = null; }
  root.innerHTML = sections.map(function(s){
    return (
      '<div class="card" data-id="' + s.id + '">' +
        '<div class="card-row">' +
          '<input class="f-name-ka" value="' + esc(s.name_ka) + '" placeholder="სახელი (KA)">' +
          '<input class="f-name-en" value="' + esc(s.name_en) + '" placeholder="Name (EN)">' +
        '</div>' +
        '<div class="card-row">' +
          '<input class="f-slug" value="' + esc(s.slug) + '" placeholder="slug">' +
          '<input type="color" class="f-color" value="' + esc(s.accent_color || '#B4472B') + '">' +
        '</div>' +
        '<div class="card-actions">' +
          '<span class="drag-handle" title="გადათრევით დალაგება">⠿</span>' +
          '<label class="toggle"><input type="checkbox" class="f-visible"' + (s.is_visible ? ' checked' : '') + '> ხილული</label>' +
          '<button class="btn small" data-act="save">შენახვა</button>' +
          '<button class="btn small danger" data-act="delete">წაშლა</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  $all('.card[data-id]', root).forEach(function(card){
    const id = card.dataset.id;
    card.querySelector('[data-act="save"]').addEventListener('click', function(){ saveSection(id, card); });
    card.querySelector('[data-act="delete"]').addEventListener('click', function(){ deleteSection(id); });
    card.querySelector('.f-visible').addEventListener('change', async function(e){
      const { error } = await sb.from('sections').update({ is_visible: e.target.checked }).eq('id', id);
      if (error) { alert(friendlyError(error)); e.target.checked = !e.target.checked; }
    });
  });
  if (sections.length) {
    sectionsSortable = Sortable.create(root, {
      handle: '.drag-handle',
      draggable: '.card[data-id]',
      animation: 150,
      forceFallback: true,
      onEnd: async function(){
        const ids = $all('.card[data-id]', root).map(function(el){ return el.dataset.id; });
        if (await persistOrder('sections', ids)) await loadSections();
      }
    });
  }
}
async function saveSection(id, card){
  const payload = {
    name_ka: card.querySelector('.f-name-ka').value.trim(),
    name_en: card.querySelector('.f-name-en').value.trim(),
    slug: card.querySelector('.f-slug').value.trim(),
    accent_color: card.querySelector('.f-color').value,
    is_visible: card.querySelector('.f-visible').checked
  };
  if (!payload.name_ka || !payload.name_en || !payload.slug) {
    alert('შეავსე სახელი (KA/EN) და slug'); return;
  }
  const { error } = await sb.from('sections').update(payload).eq('id', id);
  if (error) { alert(friendlyError(error)); return; }
  await loadSections();
}
async function createSection(){
  const name_ka = $('#newSectionKa').value.trim();
  const name_en = $('#newSectionEn').value.trim();
  const slug = $('#newSectionSlug').value.trim();
  const accent_color = $('#newSectionColor').value;
  if (!name_ka || !name_en || !slug) { alert('შეავსე სახელი (KA/EN) და slug'); return; }
  const sort_order = sections.length ? Math.max.apply(null, sections.map(function(s){ return s.sort_order; })) + 1 : 0;
  const { error } = await sb.from('sections').insert({ name_ka, name_en, slug, accent_color, sort_order });
  if (error) { alert(friendlyError(error)); return; }
  $('#newSectionKa').value = '';
  $('#newSectionEn').value = '';
  $('#newSectionSlug').value = '';
  $('#newSectionColor').value = '#B4472B';
  if (newSectionSlugState) newSectionSlugState.touched = false;
  await loadSections();
}
async function deleteSection(id){
  const count = products.filter(function(p){ return p.section_id === id; }).length;
  const msg = count > 0
    ? 'ამ სექციას მიბმული აქვს ' + count + ' პროდუქტი — მათი წაშლის გარეშე სექცია ვერ წაიშლება. მაინც ვცადო?'
    : 'დარწმუნებული ხარ, რომ გსურს ამ სექციის წაშლა?';
  if (!confirm(msg)) return;
  const { error } = await sb.from('sections').delete().eq('id', id);
  if (error) { alert(friendlyError(error)); return; }
  await loadSections();
}

/* ---------- products ---------- */
function renderProductSectionFilter(){
  const sel = $('#productSectionFilter');
  const current = sel.value;
  sel.innerHTML = ['<option value="">ყველა სექცია</option>'].concat(sections.map(function(s){
    return '<option value="' + s.id + '">' + esc(s.name_ka) + ' / ' + esc(s.name_en) + '</option>';
  })).join('');
  sel.value = (current && sections.some(function(s){ return s.id === current; })) ? current : '';
  sel.onchange = renderProducts;
}
function renderProducts(){
  const root = $('#productsList');
  if (productsSortable) { productsSortable.destroy(); productsSortable = null; }
  if (!sections.length) { root.innerHTML = '<p class="empty">ჯერ არცერთი სექცია არ არსებობს — ჯერ სექცია შექმენი „სექციები" ტაბში.</p>'; return; }

  const sectionId = $('#productSectionFilter').value;
  const sectionById = {};
  sections.forEach(function(s){ sectionById[s.id] = s; });

  let list;
  if (sectionId) {
    list = products.filter(function(p){ return p.section_id === sectionId; }).sort(function(a, b){ return a.sort_order - b.sort_order; });
  } else {
    list = products.slice().sort(function(a, b){
      const sa = sectionById[a.section_id], sbb = sectionById[b.section_id];
      const oa = sa ? sa.sort_order : 0, ob = sbb ? sbb.sort_order : 0;
      return oa !== ob ? oa - ob : a.sort_order - b.sort_order;
    });
  }
  if (!list.length) {
    root.innerHTML = '<p class="empty">' + (sectionId ? 'ამ სექციაში პროდუქტი ჯერ არ არის.' : 'ჯერ არცერთი პროდუქტი არ არის დამატებული.') + '</p>';
    return;
  }

  const showReorder = !!sectionId;
  root.innerHTML = list.map(function(p, i){
    const sec = sectionById[p.section_id];
    return (
      '<div class="card product-card" data-id="' + p.id + '">' +
        '<div class="product-thumb">' + (p.photo_url ? '<img src="' + esc(p.photo_url) + '" alt="">' : '<div class="ph-placeholder"></div>') + '</div>' +
        '<div class="product-info">' +
          (sectionId ? '' : '<div class="product-section-badge">' + esc(sec ? sec.name_ka : '') + '</div>') +
          '<div class="product-name">' + esc(p.name_ka) + ' <span class="muted">/ ' + esc(p.name_en) + '</span></div>' +
          '<div class="product-variants">' + ((p.variants || []).map(function(v){ return v.amount + unitLabel(v.unit); }).join(' · ') || '<span class="muted">ვარიანტები არ არის</span>') + '</div>' +
        '</div>' +
        '<div class="card-actions">' +
          (showReorder ? '<span class="drag-handle" title="გადათრევით დალაგება">⠿</span>' : '') +
          (showReorder ? '<button class="icon-btn" data-act="up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' : '') +
          (showReorder ? '<button class="icon-btn" data-act="down"' + (i === list.length - 1 ? ' disabled' : '') + '>↓</button>' : '') +
          '<label class="toggle"><input type="checkbox" class="f-visible"' + (p.is_visible ? ' checked' : '') + '> ხილული</label>' +
          '<button class="btn small" data-act="edit">რედაქტირება</button>' +
          '<button class="btn small danger" data-act="delete">წაშლა</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
  $all('.product-card', root).forEach(function(card){
    const id = card.dataset.id;
    const upBtn = card.querySelector('[data-act="up"]');
    if (upBtn) upBtn.addEventListener('click', async function(){
      if (await swapSortOrder('products', list, id, -1)) loadProducts();
    });
    const downBtn = card.querySelector('[data-act="down"]');
    if (downBtn) downBtn.addEventListener('click', async function(){
      if (await swapSortOrder('products', list, id, 1)) loadProducts();
    });
    card.querySelector('.f-visible').addEventListener('change', async function(e){
      const { error } = await sb.from('products').update({ is_visible: e.target.checked }).eq('id', id);
      if (error) { alert(friendlyError(error)); e.target.checked = !e.target.checked; }
    });
    card.querySelector('[data-act="edit"]').addEventListener('click', function(){
      openProductModal(products.find(function(p){ return p.id === id; }));
    });
    card.querySelector('[data-act="delete"]').addEventListener('click', async function(){
      if (!confirm('დარწმუნებული ხარ, რომ გსურს ამ პროდუქტის წაშლა?')) return;
      const prod = products.find(function(p){ return p.id === id; });
      const { error } = await sb.from('products').delete().eq('id', id);
      if (error) { alert(friendlyError(error)); return; }
      if (prod && prod.photo_url) await deleteImage(prod.photo_url);
      await loadProducts();
    });
  });

  if (showReorder && list.length > 1) {
    productsSortable = Sortable.create(root, {
      handle: '.drag-handle',
      draggable: '.product-card',
      animation: 150,
      forceFallback: true,
      onEnd: async function(){
        const ids = $all('.product-card', root).map(function(el){ return el.dataset.id; });
        if (await persistOrder('products', ids)) await loadProducts();
      }
    });
  }
}

function closeModal(){ $('#modalRoot').innerHTML = ''; }
function openProductModal(product, presetSectionId){
  const isEdit = !!product;
  const sectionOptions = sections.map(function(s){
    const selected = (product && product.section_id === s.id) || (!product && presetSectionId === s.id) ? ' selected' : '';
    return '<option value="' + s.id + '"' + selected + '>' + esc(s.name_ka) + ' / ' + esc(s.name_en) + '</option>';
  }).join('');
  const variants = (product && product.variants) || [];

  $('#modalRoot').innerHTML = (
    '<div class="modal-overlay">' +
      '<div class="modal">' +
        '<h2>' + (isEdit ? 'პროდუქტის რედაქტირება' : 'ახალი პროდუქტი') + '</h2>' +
        '<form id="productForm" novalidate>' +
          '<label>სექცია<select id="pfSection">' + sectionOptions + '</select></label>' +
          '<div class="form-row">' +
            '<label>სახელი (KA)<input id="pfNameKa" value="' + esc(product && product.name_ka || '') + '" required></label>' +
            '<label>Name (EN)<input id="pfNameEn" value="' + esc(product && product.name_en || '') + '" required></label>' +
          '</div>' +
          '<label>Slug<input id="pfSlug" value="' + esc(product && product.slug || '') + '" required></label>' +
          '<div class="form-row">' +
            '<label>აღწერა (KA)<textarea id="pfDescKa" rows="3">' + esc(product && product.description_ka || '') + '</textarea></label>' +
            '<label>Description (EN)<textarea id="pfDescEn" rows="3">' + esc(product && product.description_en || '') + '</textarea></label>' +
          '</div>' +
          '<label>ფოტო (4:5 პროპორცია რეკომენდებულია)<input type="file" id="pfPhoto" accept="image/jpeg,image/png,image/webp,.heic,.heif"></label>' +
          (product && product.photo_url ? '<img class="modal-preview" src="' + esc(product.photo_url) + '">' : '') +
          '<div class="variants-block">' +
            '<div class="variants-head">პროდუქტის - წონა/რაოდენობა</div>' +
            '<div id="variantsRows"></div>' +
            '<button type="button" class="btn small" id="addVariantRow">+ ახალი წონის დამატება</button>' +
          '</div>' +
          '<div class="modal-actions">' +
            '<button type="button" class="btn ghost" id="cancelProductModal">გაუქმება</button>' +
            '<button type="submit" class="btn solid">შენახვა</button>' +
          '</div>' +
          '<p class="err" id="productFormError" hidden></p>' +
        '</form>' +
      '</div>' +
    '</div>'
  );

  const rowsRoot = $('#variantsRows');
  function addVariantRow(amount, unit){
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.innerHTML = (
      '<input type="number" min="0" step="1" class="v-amount" placeholder="წონა" value="' + (amount || '') + '">' +
      '<select class="v-unit">' +
        '<option value="gr"' + (unit === 'kg' || unit === 'pcs' ? '' : ' selected') + '>გრ</option>' +
        '<option value="kg"' + (unit === 'kg' ? ' selected' : '') + '>კგ</option>' +
        '<option value="pcs"' + (unit === 'pcs' ? ' selected' : '') + '>ცალი</option>' +
      '</select>' +
      '<button type="button" class="icon-btn v-remove">×</button>'
    );
    row.querySelector('.v-remove').addEventListener('click', function(){ row.remove(); });
    const amountInput = row.querySelector('.v-amount');
    const unitSelect = row.querySelector('.v-unit');
    amountInput.addEventListener('input', function(){
      const val = Number(amountInput.value);
      if (!amountInput.value || !val) return; // empty, 0, or invalid - leave the unit untouched
      const sec = sections.find(function(s){ return s.id === $('#pfSection').value; });
      unitSelect.value = (sec && sec.slug === 'tea') ? 'pcs' : (val <= 10 ? 'kg' : 'gr');
    });
    rowsRoot.appendChild(row);
  }
  if (variants.length) { variants.forEach(function(v){ addVariantRow(v.amount, v.unit); }); } else { addVariantRow(); }
  $('#addVariantRow').addEventListener('click', function(){ addVariantRow(); });
  $('#cancelProductModal').addEventListener('click', closeModal);
  wireSlugAutoFill($('#pfNameEn'), $('#pfSlug'), isEdit);

  $('#productForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const errEl = $('#productFormError');
    errEl.hidden = true;

    const section_id = $('#pfSection').value;
    const name_ka = $('#pfNameKa').value.trim();
    const name_en = $('#pfNameEn').value.trim();
    const slug = $('#pfSlug').value.trim();
    const description_ka = $('#pfDescKa').value.trim();
    const description_en = $('#pfDescEn').value.trim();
    if (!section_id || !name_ka || !name_en || !slug) {
      errEl.textContent = 'შეავსე ყველა სავალდებულო ველი'; errEl.hidden = false; return;
    }
    const variantsPayload = $all('.variant-row', rowsRoot).map(function(r){
      return { amount: Number(r.querySelector('.v-amount').value), unit: r.querySelector('.v-unit').value };
    }).filter(function(v){ return v.amount > 0; });

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      let photo_url = (product && product.photo_url) || null;
      const file = $('#pfPhoto').files[0];
      if (file) {
        const newUrl = await uploadImage(file, 'products', 1200, 1500, 180 * 1024);
        if (product && product.photo_url) await deleteImage(product.photo_url);
        photo_url = newUrl;
      }
      const payload = { section_id, name_ka, name_en, slug, description_ka, description_en, photo_url, variants: variantsPayload };
      let error;
      if (isEdit) {
        ({ error } = await sb.from('products').update(payload).eq('id', product.id));
      } else {
        const sectionProducts = products.filter(function(p){ return p.section_id === section_id; });
        payload.sort_order = sectionProducts.length ? Math.max.apply(null, sectionProducts.map(function(p){ return p.sort_order; })) + 1 : 0;
        ({ error } = await sb.from('products').insert(payload));
      }
      if (error) throw error;
      closeModal();
      await loadProducts();
    } catch (err) {
      errEl.textContent = friendlyError(err); errEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/* ---------- blog ---------- */
async function loadBlogPosts(){
  const { data, error } = await sb.from('blog_posts').select('*').order('published_at', { ascending: false });
  if (error) { alert('ბლოგის ჩატვირთვის შეცდომა: ' + error.message); return; }
  blogPosts = data || [];
  renderBlogList();
}
function renderBlogList(){
  const root = $('#blogList');
  if (!blogPosts.length) { root.innerHTML = '<p class="empty">ჯერ არცერთი პოსტი არ არის დამატებული.</p>'; return; }
  root.innerHTML = blogPosts.map(function(p){
    return (
      '<div class="card product-card" data-id="' + p.id + '">' +
        '<div class="product-thumb">' + (p.cover_photo_url ? '<img src="' + esc(p.cover_photo_url) + '" alt="">' : '<div class="ph-placeholder"></div>') + '</div>' +
        '<div class="product-info">' +
          '<div class="product-name">' + esc(p.title_ka) + ' <span class="muted">/ ' + esc(p.title_en) + '</span></div>' +
          '<div class="product-variants">' + esc(p.published_at || '') + '</div>' +
        '</div>' +
        '<div class="card-actions">' +
          '<label class="toggle"><input type="checkbox" class="f-published"' + (p.is_published ? ' checked' : '') + '> გამოქვეყნებული</label>' +
          '<button class="btn small" data-act="edit">რედაქტირება</button>' +
          '<button class="btn small danger" data-act="delete">წაშლა</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
  $all('.product-card', root).forEach(function(card){
    const id = card.dataset.id;
    card.querySelector('.f-published').addEventListener('change', async function(e){
      const { error } = await sb.from('blog_posts').update({ is_published: e.target.checked }).eq('id', id);
      if (error) { alert(friendlyError(error)); e.target.checked = !e.target.checked; }
    });
    card.querySelector('[data-act="edit"]').addEventListener('click', function(){
      openBlogModal(blogPosts.find(function(p){ return p.id === id; }));
    });
    card.querySelector('[data-act="delete"]').addEventListener('click', async function(){
      if (!confirm('დარწმუნებული ხარ, რომ გსურს ამ პოსტის წაშლა?')) return;
      const post = blogPosts.find(function(p){ return p.id === id; });
      const { error } = await sb.from('blog_posts').delete().eq('id', id);
      if (error) { alert(friendlyError(error)); return; }
      if (post && post.cover_photo_url) await deleteImage(post.cover_photo_url);
      await loadBlogPosts();
    });
  });
}
function attachQuillImageHandler(quill){
  const toolbar = quill.getModule('toolbar');
  toolbar.addHandler('image', function(){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,.heic,.heif';
    input.onchange = async function(){
      const file = input.files[0];
      if (!file) return;
      const range = quill.getSelection(true);
      try {
        const url = await uploadImage(file, 'blog-inline', 1400, 1400, 220 * 1024);
        quill.insertEmbed(range.index, 'image', url, 'user');
        quill.setSelection(range.index + 1);
      } catch (err) {
        alert('ფოტოს ატვირთვის შეცდომა: ' + friendlyError(err));
      }
    };
    input.click();
  });
}
function closeBlogModal(){
  quillKa = null; quillEn = null;
  closeModal();
}
function openBlogModal(post){
  const isEdit = !!post;
  const todayStr = new Date().toISOString().slice(0, 10);
  $('#modalRoot').innerHTML = (
    '<div class="modal-overlay">' +
      '<div class="modal modal-wide">' +
        '<h2>' + (isEdit ? 'პოსტის რედაქტირება' : 'ახალი პოსტი') + '</h2>' +
        '<form id="blogForm" novalidate>' +
          '<div class="form-row">' +
            '<label>სათაური (KA)<input id="bpTitleKa" value="' + esc(post && post.title_ka || '') + '" required></label>' +
            '<label>Title (EN)<input id="bpTitleEn" value="' + esc(post && post.title_en || '') + '" required></label>' +
          '</div>' +
          '<label>Slug<input id="bpSlug" value="' + esc(post && post.slug || '') + '" required></label>' +
          '<div class="form-row">' +
            '<label>გამოქვეყნების თარიღი<input type="date" id="bpPublishedAt" value="' + esc((post && post.published_at) || todayStr) + '"></label>' +
            '<label class="toggle modal-toggle-row"><input type="checkbox" id="bpPublished"' + (!post || post.is_published ? ' checked' : '') + '> გამოქვეყნებული</label>' +
          '</div>' +
          '<label>Cover ფოტო (რეკომენდებული ~1200×630)<input type="file" id="bpCover" accept="image/jpeg,image/png,image/webp,.heic,.heif"></label>' +
          (post && post.cover_photo_url ? '<img class="modal-preview" src="' + esc(post.cover_photo_url) + '">' : '') +
          '<div class="editor-tabs">' +
            '<button type="button" class="editor-tab-btn active" data-editor-tab="ka">ქართული</button>' +
            '<button type="button" class="editor-tab-btn" data-editor-tab="en">English</button>' +
          '</div>' +
          '<div class="editor-pane active" id="editorPaneKa"><div id="quillKa"></div></div>' +
          '<div class="editor-pane" id="editorPaneEn"><div id="quillEn"></div></div>' +
          '<div class="modal-actions">' +
            '<button type="button" class="btn ghost" id="cancelBlogModal">გაუქმება</button>' +
            '<button type="submit" class="btn solid">შენახვა</button>' +
          '</div>' +
          '<p class="err" id="blogFormError" hidden></p>' +
        '</form>' +
      '</div>' +
    '</div>'
  );

  const toolbarOptions = [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    ['image'],
    ['clean']
  ];
  quillKa = new Quill('#quillKa', { theme: 'snow', modules: { toolbar: toolbarOptions } });
  quillEn = new Quill('#quillEn', { theme: 'snow', modules: { toolbar: toolbarOptions } });
  quillKa.root.innerHTML = DOMPurify.sanitize((post && post.body_ka) || '');
  quillEn.root.innerHTML = DOMPurify.sanitize((post && post.body_en) || '');
  attachQuillImageHandler(quillKa);
  attachQuillImageHandler(quillEn);

  $all('.editor-tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      $all('.editor-tab-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      $('#editorPaneKa').classList.toggle('active', btn.dataset.editorTab === 'ka');
      $('#editorPaneEn').classList.toggle('active', btn.dataset.editorTab === 'en');
    });
  });

  $('#cancelBlogModal').addEventListener('click', closeBlogModal);
  wireSlugAutoFill($('#bpTitleEn'), $('#bpSlug'), isEdit);

  $('#blogForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const errEl = $('#blogFormError');
    errEl.hidden = true;
    const title_ka = $('#bpTitleKa').value.trim();
    const title_en = $('#bpTitleEn').value.trim();
    const slug = $('#bpSlug').value.trim();
    const published_at = $('#bpPublishedAt').value || null;
    const is_published = $('#bpPublished').checked;
    if (!title_ka || !title_en || !slug) {
      errEl.textContent = 'შეავსე სათაური (KA/EN) და slug'; errEl.hidden = false; return;
    }
    const body_ka = DOMPurify.sanitize(quillKa.root.innerHTML);
    const body_en = DOMPurify.sanitize(quillEn.root.innerHTML);

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      let cover_photo_url = (post && post.cover_photo_url) || null;
      const file = $('#bpCover').files[0];
      if (file) {
        const newUrl = await uploadImage(file, 'blog', 1200, 630, 180 * 1024);
        if (post && post.cover_photo_url) await deleteImage(post.cover_photo_url);
        cover_photo_url = newUrl;
      }
      const payload = { title_ka, title_en, slug, published_at, is_published, cover_photo_url, body_ka, body_en };
      let error;
      if (isEdit) {
        ({ error } = await sb.from('blog_posts').update(payload).eq('id', post.id));
      } else {
        ({ error } = await sb.from('blog_posts').insert(payload));
      }
      if (error) throw error;
      closeBlogModal();
      await loadBlogPosts();
    } catch (err) {
      errEl.textContent = friendlyError(err); errEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/* ---------- pages: contact info (email only - phone/address moved to contact_locations) + about ---------- */
async function loadContactInfo(){
  const { data, error } = await sb.from('contact_info').select('*').eq('id', 1).maybeSingle();
  if (error) { alert('კონტაქტის ინფოს ჩატვირთვის შეცდომა: ' + error.message); return; }
  contactInfo = data;
  if (!contactInfo) return;
  $('#ciEmail').value = contactInfo.email || '';
}
async function saveContactInfo(){
  const payload = { email: $('#ciEmail').value.trim() };
  const { error } = await sb.from('contact_info').update(payload).eq('id', 1);
  const msgEl = $('#contactInfoSaved');
  if (error) { msgEl.className = 'err'; msgEl.textContent = friendlyError(error); msgEl.hidden = false; return; }
  msgEl.className = 'err ok'; msgEl.textContent = 'შენახულია.'; msgEl.hidden = false;
  setTimeout(function(){ msgEl.hidden = true; }, 2500);
}

/* ---------- contact locations ---------- */
async function loadContactLocations(){
  const { data, error } = await sb.from('contact_locations').select('*').order('sort_order');
  if (error) { alert('ლოკაციების ჩატვირთვის შეცდომა: ' + error.message); return; }
  contactLocations = data || [];
  renderLocationsList();
}
function renderLocationsList(){
  const root = $('#locationsList');
  if (!contactLocations.length) { root.innerHTML = '<p class="empty">ჯერ არცერთი ლოკაცია არ არის დამატებული.</p>'; return; }
  root.innerHTML = contactLocations.map(function(l, i){
    const phonesText = (l.phones || []).map(esc).join(' · ') || '<span class="muted">ტელეფონი არ არის</span>';
    return (
      '<div class="card" data-id="' + l.id + '">' +
        '<div class="product-name">' + esc(l.label_ka) + ' <span class="muted">/ ' + esc(l.label_en) + '</span></div>' +
        '<div class="muted">' + esc(l.address_ka) + ' / ' + esc(l.address_en) + '</div>' +
        '<div class="product-variants">' + phonesText + '</div>' +
        '<div class="card-actions">' +
          '<button class="icon-btn" data-act="up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button class="icon-btn" data-act="down"' + (i === contactLocations.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<label class="toggle"><input type="checkbox" class="f-visible"' + (l.is_visible ? ' checked' : '') + '> ხილული</label>' +
          '<button class="btn small" data-act="edit">რედაქტირება</button>' +
          '<button class="btn small danger" data-act="delete">წაშლა</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
  $all('.card[data-id]', root).forEach(function(card){
    const id = card.dataset.id;
    const upBtn = card.querySelector('[data-act="up"]');
    if (upBtn) upBtn.addEventListener('click', async function(){
      if (await swapSortOrder('contact_locations', contactLocations, id, -1)) loadContactLocations();
    });
    const downBtn = card.querySelector('[data-act="down"]');
    if (downBtn) downBtn.addEventListener('click', async function(){
      if (await swapSortOrder('contact_locations', contactLocations, id, 1)) loadContactLocations();
    });
    card.querySelector('.f-visible').addEventListener('change', async function(e){
      const { error } = await sb.from('contact_locations').update({ is_visible: e.target.checked }).eq('id', id);
      if (error) { alert(friendlyError(error)); e.target.checked = !e.target.checked; }
    });
    card.querySelector('[data-act="edit"]').addEventListener('click', function(){
      openLocationModal(contactLocations.find(function(l){ return l.id === id; }));
    });
    card.querySelector('[data-act="delete"]').addEventListener('click', async function(){
      if (!confirm('დარწმუნებული ხარ, რომ გსურს ამ ლოკაციის წაშლა?')) return;
      const { error } = await sb.from('contact_locations').delete().eq('id', id);
      if (error) { alert(friendlyError(error)); return; }
      await loadContactLocations();
    });
  });
}
function closeLocationModal(){ closeModal(); }
function openLocationModal(location){
  const isEdit = !!location;
  $('#modalRoot').innerHTML = (
    '<div class="modal-overlay">' +
      '<div class="modal">' +
        '<h2>' + (isEdit ? 'ლოკაციის რედაქტირება' : 'ახალი ლოკაცია') + '</h2>' +
        '<form id="locationForm" novalidate>' +
          '<div class="form-row">' +
            '<label>სახელი (KA)<input id="locLabelKa" value="' + esc(location && location.label_ka || '') + '" required></label>' +
            '<label>Name (EN)<input id="locLabelEn" value="' + esc(location && location.label_en || '') + '" required></label>' +
          '</div>' +
          '<div class="form-row">' +
            '<label>მისამართი (KA)<input id="locAddressKa" value="' + esc(location && location.address_ka || '') + '" required></label>' +
            '<label>Address (EN)<input id="locAddressEn" value="' + esc(location && location.address_en || '') + '" required></label>' +
          '</div>' +
          '<div class="variants-block">' +
            '<div class="variants-head">ტელეფონის ნომრები</div>' +
            '<div id="phoneRows"></div>' +
            '<button type="button" class="btn small" id="addPhoneRow">+ ტელეფონის დამატება</button>' +
          '</div>' +
          '<div class="modal-actions">' +
            '<button type="button" class="btn ghost" id="cancelLocationModal">გაუქმება</button>' +
            '<button type="submit" class="btn solid">შენახვა</button>' +
          '</div>' +
          '<p class="err" id="locationFormError" hidden></p>' +
        '</form>' +
      '</div>' +
    '</div>'
  );

  const rowsRoot = $('#phoneRows');
  function addPhoneRow(value){
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.innerHTML = (
      '<input type="text" class="v-phone" placeholder="+995 5XX XXX XXX" value="' + esc(value || '') + '">' +
      '<button type="button" class="icon-btn v-remove">×</button>'
    );
    row.querySelector('.v-remove').addEventListener('click', function(){ row.remove(); });
    rowsRoot.appendChild(row);
  }
  const existingPhones = (location && location.phones) || [];
  if (existingPhones.length) { existingPhones.forEach(function(p){ addPhoneRow(p); }); } else { addPhoneRow(); }
  $('#addPhoneRow').addEventListener('click', function(){ addPhoneRow(); });
  $('#cancelLocationModal').addEventListener('click', closeLocationModal);

  $('#locationForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const errEl = $('#locationFormError');
    errEl.hidden = true;
    const label_ka = $('#locLabelKa').value.trim();
    const label_en = $('#locLabelEn').value.trim();
    const address_ka = $('#locAddressKa').value.trim();
    const address_en = $('#locAddressEn').value.trim();
    if (!label_ka || !label_en || !address_ka || !address_en) {
      errEl.textContent = 'შეავსე სახელი და მისამართი ორივე ენაზე'; errEl.hidden = false; return;
    }
    const phones = $all('.v-phone', rowsRoot).map(function(inp){ return inp.value.trim(); }).filter(function(v){ return v; });

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const payload = { label_ka, label_en, address_ka, address_en, phones };
      let error;
      if (isEdit) {
        ({ error } = await sb.from('contact_locations').update(payload).eq('id', location.id));
      } else {
        payload.sort_order = contactLocations.length ? Math.max.apply(null, contactLocations.map(function(l){ return l.sort_order; })) + 1 : 0;
        ({ error } = await sb.from('contact_locations').insert(payload));
      }
      if (error) throw error;
      closeLocationModal();
      await loadContactLocations();
    } catch (err) {
      errEl.textContent = friendlyError(err); errEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}
async function loadAboutPage(){
  const { data, error } = await sb.from('about_page').select('*').eq('id', 1).maybeSingle();
  if (error) { alert('ჩვენს-შესახებ გვერდის ჩატვირთვის შეცდომა: ' + error.message); return; }
  aboutPageData = data;
  if (!aboutPageData) return;
  $('#apTitleKa').value = aboutPageData.title_ka || '';
  $('#apTitleEn').value = aboutPageData.title_en || '';
  $('#apBodyKa').value = aboutPageData.body_ka || '';
  $('#apBodyEn').value = aboutPageData.body_en || '';
}
async function saveAboutPage(){
  const payload = {
    title_ka: $('#apTitleKa').value.trim(),
    title_en: $('#apTitleEn').value.trim(),
    body_ka: $('#apBodyKa').value,
    body_en: $('#apBodyEn').value
  };
  const { error } = await sb.from('about_page').update(payload).eq('id', 1);
  const msgEl = $('#aboutPageSaved');
  if (error) { msgEl.className = 'err'; msgEl.textContent = friendlyError(error); msgEl.hidden = false; return; }
  msgEl.className = 'err ok'; msgEl.textContent = 'შენახულია.'; msgEl.hidden = false;
  setTimeout(function(){ msgEl.hidden = true; }, 2500);
}

/* ---------- messages ---------- */
/* manual month lookup instead of toLocaleString('ka-GE', ...) - Georgian Intl
   locale/ICU support is inconsistent across browsers, so we format by hand. */
const KA_MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
function formatDateTime(iso){
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return d.getDate() + ' ' + KA_MONTHS[d.getMonth()] + ', ' + d.getFullYear() + ' · ' + hh + ':' + mm;
}
async function loadMessages(){
  const { data, error } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false });
  if (error) { alert('შეტყობინებების ჩატვირთვის შეცდომა: ' + error.message); return; }
  contactMessages = data || [];
  renderMessages();
}
function renderMessages(){
  const root = $('#messagesList');
  if (!contactMessages.length) { root.innerHTML = '<p class="empty">ჯერ არცერთი შეტყობინება არ არის.</p>'; return; }
  root.innerHTML = contactMessages.map(function(m){
    return (
      '<div class="card message-card' + (m.is_read ? '' : ' unread') + '" data-id="' + m.id + '">' +
        '<div class="message-meta"><strong>' + esc(m.name) + '</strong> <span class="muted">' + esc(m.email) + '</span> <span class="muted">· ' + esc(formatDateTime(m.created_at)) + '</span></div>' +
        '<div class="message-body">' + esc(m.message) + '</div>' +
        '<div class="card-actions">' +
          '<label class="toggle"><input type="checkbox" class="f-read"' + (m.is_read ? ' checked' : '') + '> წაკითხული</label>' +
          '<button class="btn small danger" data-act="delete">წაშლა</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
  $all('.message-card', root).forEach(function(card){
    const id = card.dataset.id;
    card.querySelector('.f-read').addEventListener('change', async function(e){
      const { error } = await sb.from('contact_messages').update({ is_read: e.target.checked }).eq('id', id);
      if (error) { alert(friendlyError(error)); e.target.checked = !e.target.checked; return; }
      await loadMessages();
    });
    card.querySelector('[data-act="delete"]').addEventListener('click', async function(){
      if (!confirm('წავშალო ეს შეტყობინება?')) return;
      const { error } = await sb.from('contact_messages').delete().eq('id', id);
      if (error) { alert(friendlyError(error)); return; }
      await loadMessages();
    });
  });
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', function(){
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#logoutBtn').addEventListener('click', handleLogout);
  $all('.tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      $all('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      $all('.tab-panel').forEach(function(p){ p.hidden = true; });
      $('#tab-' + btn.dataset.tab).hidden = false;
    });
  });
  $('#heroFileInput').addEventListener('change', handleHeroFileChange);
  $('#createSectionBtn').addEventListener('click', createSection);
  newSectionSlugState = wireSlugAutoFill($('#newSectionEn'), $('#newSectionSlug'), false);
  $('#addProductBtn').addEventListener('click', function(){
    if (!sections.length) {
      alert('ჯერ არცერთი სექცია არ არსებობს — ჯერ სექცია შექმენი „სექციები" ტაბში.');
      return;
    }
    openProductModal(null, $('#productSectionFilter').value || null);
  });
  $('#addBlogPostBtn').addEventListener('click', function(){ openBlogModal(null); });
  $('#saveContactInfoBtn').addEventListener('click', saveContactInfo);
  $('#addLocationBtn').addEventListener('click', function(){ openLocationModal(null); });
  $('#saveAboutPageBtn').addEventListener('click', saveAboutPage);
  checkAuth();
});
