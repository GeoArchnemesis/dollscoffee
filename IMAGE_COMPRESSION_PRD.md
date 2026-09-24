# PRD: Image Compression & Lazy-Loading Pipeline

Status: proposed
Owner: Giorgi (product), Claude Code (implementation)
Scope: two parts — (1) `admin/admin.js` image upload/compression pipeline (hero, products, blog cover, blog inline) — §1-§3; (2) a lazy-loading pass on the public site's photo rendering in `script.js` — §3.5. No DB/schema changes, no changes to `admin/index.html` markup beyond the `accept` attributes noted in §3.2.

## 1. Background — what exists today

`admin/admin.js` already does client-side compression before every image upload (function `compressImage` + `uploadImage`, lines ~104-136):

- Draws the source file into a `<canvas>` at a fixed max width/height per context (hero 1600×800, product 1200×1500, blog inline 1400×1400, blog cover 1200×630), never upscaling.
- Calls `canvas.toBlob(..., 'image/webp', 0.82)` — fixed quality, always WebP.
- Rejects anything whose `file.type` isn't exactly `image/jpeg`, `image/png`, or `image/webp`.
- Caps the original file at 5MB before touching it.
- Uploads the result to Supabase Storage as `<uuid>.webp`.

This is a solid foundation (WebP is the right target format — see §2) but has four concrete gaps that matter for a real admin uploading real product/coffee photos from a phone:

1. **No EXIF auto-rotation.** `drawImage()` on a plain `new Image()` ignores the photo's EXIF orientation tag. A portrait photo taken on a phone held sideways can come out rotated 90°/upside-down on the canvas even though it looks correct in the OS file picker preview. This is one of the most common real-world complaints with hand-rolled image pipelines.
2. **No HEIC/HEIF support.** iPhones save camera photos as HEIC by default. Some mobile browsers transcode HEIC to JPEG automatically when picking a file for `<input type="file">`, but this is not guaranteed across iOS Safari/Chrome versions. When it isn't transcoded, `file.type` comes back as `image/heic`/`image/heif` (or sometimes an empty string), and the current regex silently rejects the upload with a "only JPEG, PNG or WebP allowed" error — with no indication to the admin of *why* their phone photo won't upload.
3. **Fixed quality, not fixed target size.** `0.82` quality on a simple, low-detail photo (e.g. a coffee bag on a plain background) wastes bytes; the same `0.82` on a busy, high-detail photo (steam, texture, multiple products) can still produce a surprisingly large file. A target-file-size approach (used by libraries like `browser-image-compression`) gives more predictable, consistently small output without a visible quality hit.
4. **Silent format fallback risk.** Per the HTML spec, if a browser's canvas can't encode the requested MIME type, `toBlob()` does **not** throw — it silently returns a `image/png` blob instead. The current code doesn't check `blob.type` before hard-coding the `.webp` extension and `contentType: 'image/webp'` on upload. WebP encoding is supported by all current major browsers, so this is a low-probability edge case today, but it's a silent-failure trap worth closing while we're in this code (and it's exactly why AVIF output is *not* recommended below — see §2).

## 2. Format decision: stay on WebP, do not switch to AVIF (yet)

AVIF compresses ~20-30% smaller than WebP at comparable perceptual quality, so it's tempting. It is **not recommended for this project's upload pipeline**, for concrete reasons:

- `canvas.toBlob('image/avif', ...)` encoding support is inconsistent across current major browsers (some browsers can *display* AVIF but cannot *encode* it from a canvas), and per §1.4 an unsupported request silently downgrades to PNG rather than failing loudly — so a canvas-based AVIF pipeline is a real correctness risk, not a hypothetical one.
- A reliable AVIF encoder in the browser means shipping a WASM codec (e.g. Squoosh's `@jsquash/avif`), which conflicts with this project's "no build step, plain script tags" architecture and adds real weight/complexity for a site this size.
- WebP already has essentially universal support for **decoding** (i.e. every visitor's browser can display the images this site serves), which is the side that actually matters for page-load speed.

Recommendation: keep WebP as the sole output format now; revisit AVIF only if/when the project adopts a build step or server-side processing.

## 3. What to change

§3.1-3.4 are inside `admin/admin.js` (no new upload UI, no schema changes); §3.5 is inside `script.js` (public site).

### 3.1 Fix orientation: use `createImageBitmap` instead of `new Image()`

Replace the `new Image()` + `drawImage()` decode step in `compressImage()` with:

```js
const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
```

`imageOrientation: 'from-image'` tells the browser to bake the EXIF rotation into the decoded bitmap before it's drawn to canvas, so the compressed output always matches what the photo looks like right-side-up. This is supported in current Chrome, Firefox, and Safari. Wrap it in a `try { ... } catch { fall back to the existing Image()-based path }` so a decode failure on an unusual file never blocks the upload — it just skips auto-rotation for that one file instead of erroring out.

### 3.2 Add a HEIC/HEIF pre-conversion step

Before the existing type check, detect HEIC/HEIF by MIME type **or** file extension (`.heic`/`.heif`), since some browsers report an empty `file.type` for these files:

```js
const isHeic = /image\/hei(c|f)/.test(file.type) || /\.(heic|heif)$/i.test(file.name);
```

If `isHeic`, convert to a JPEG `Blob` first using `heic2any` (a small, dependency-free, browser-only HEIC→JPEG converter, loaded from CDN exactly like the project already loads the Supabase client — no build step required), then feed that JPEG blob into the existing compression pipeline unchanged. Also update the `accept` attribute on the three file inputs (`pfPhoto`, hero input, `bpCover`) to include `.heic,.heif` so iPhone users see their photos in the picker instead of them being greyed out.

If the `heic2any` conversion itself throws (corrupt file, unsupported variant), show the existing Georgian error message so the admin gets clear feedback instead of a silent failure.

### 3.3 Replace fixed quality with a target-file-size loop

Change `compressImage()`'s signature to accept a target byte budget per context instead of (or alongside) a fixed quality number, and iteratively re-encode at decreasing quality until the blob is under budget or a quality floor is hit (so we never sacrifice more quality than necessary, and never go so low that photos look bad):

- Start at quality `0.85`.
- If `blob.size` is over budget, retry at `0.75`, then `0.65`, then `0.55` (quality floor — stop here even if still over budget, to protect visual quality per the product goal).
- Suggested per-context byte budgets (tune after seeing real photos, these are reasonable starting points): hero `280KB`, product photo `180KB`, blog cover `180KB`, blog inline `220KB`.

This typically needs only 1-2 extra encode passes (canvas re-encoding is fast, well under a second even on modest phones) and gives predictable output sizes regardless of how detailed a given photo is.

### 3.4 Validate the actual output format before uploading

After `compressImage()` resolves, check `blob.type === 'image/webp'`. If the browser silently fell back to PNG (per §1.4 — expected to be rare, but now handled instead of silently mismatched), upload with the correct `.png` extension and `contentType: 'image/png'` instead of forcing a `.webp` label onto PNG bytes.

### 3.5 Lazy-load public-site photos (`script.js`)

Separate root cause, same symptom ("photos load slowly"): the public site renders hero slides, product photos, and blog covers as CSS `background-image` on `<div>`s rather than `<img>` tags (confirmed at the `background-image:url(...)` call sites around lines 226, 369-370, 438-439, 610-611, 628-629 of `script.js`). CSS background images get **no** native lazy-loading — every one of them downloads immediately on page load, whether or not it's ever scrolled into view. Native `loading="lazy"` only exists on `<img>`, so fixing this means adding a small `IntersectionObserver`-based helper rather than a one-line attribute.

Add one reusable helper, e.g.:

```js
function lazyBackground(el, url){
  if (!url) return;
  if (!('IntersectionObserver' in window)) { el.style.backgroundImage = "url('"+url+"')"; return; }
  const io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting){
        entry.target.style.backgroundImage = "url('"+url+"')";
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' }); // start loading slightly before it scrolls into view
  io.observe(el);
}
```

Apply it selectively, not everywhere — the goal is to defer photos the visitor hasn't scrolled to yet, not to delay the first thing they see:

- **Lazy** (below-the-fold in the common case, safe to defer): product catalog grid swatches (~line 369-370), blog list cover cards (~line 610-611), blog inline body images.
- **Eager, keep as-is** (above-the-fold / the exact content the visitor just navigated to see — deferring these would only add a visible delay with no benefit): the hero slider (~line 226), a single product's own detail-page photo (~line 438-439), a single blog post's own detail-page cover (~line 628-629).

## 4. Explicitly out of scope for this change

- **Responsive `srcset`/multiple sizes per image.** Not needed at this project's scale; the fixed per-context dimensions already keep files reasonably small.
- **Server-side processing.** No server exists in this architecture (Supabase Storage + static site); client-side compression stays the right approach.
- **AVIF output** — see §2.

## 5. Acceptance criteria

- [ ] Uploading a phone photo taken in portrait orientation (with EXIF rotation set) produces a correctly-oriented compressed image, not a sideways/upside-down one.
- [ ] Uploading a native iPhone `.heic` photo (unconverted) succeeds and produces a normal WebP output — no "only JPEG/PNG/WebP" rejection.
- [ ] The four file-picker `accept` attributes (hero, product, blog cover, blog inline) include `.heic`/`.heif`.
- [ ] A busy/high-detail test photo and a simple/flat test photo both come out under their context's target byte budget (or at the quality floor if truly not achievable), rather than both landing at whatever size a fixed `0.82` happens to produce.
- [ ] `blob.type` is checked after compression; the uploaded file's extension/`contentType` always matches what the browser actually encoded.
- [ ] All four existing upload call sites (hero, product, blog cover, blog inline) keep working exactly as before for ordinary JPEG/PNG/WebP uploads — this is a quality/robustness improvement, not a behavior change for the common case.
- [ ] No new build step, bundler, or server component introduced — `heic2any` loaded via a plain `<script>` CDN tag, same pattern as the existing Supabase client include.
- [ ] Product catalog grid photos, blog list cover photos, and blog inline body images only start downloading once they're near the viewport (verifiable in DevTools Network tab: scrolling down triggers new image requests instead of them all firing on initial page load).
- [ ] The hero slider and the single-item detail-page photo (product page, blog post page) still load immediately — no visible delay or blank flash on the exact content the visitor navigated to see.
- [ ] Site behavior is otherwise unchanged: routing, `history.pushState`, View Transitions, language/theme toggle, and the cookie banner all keep working.
