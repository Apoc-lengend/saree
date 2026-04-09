# Project Context, Architecture & Engineering Guide
## Parinay Saree — E-Commerce Admin & Frontend (V4 — Full Audit Edition)

> **Last Updated:** April 2026 — This document reflects the complete, current state of the codebase after all optimization, centralization, and feature additions from both the V3 and V4 sessions. Any AI reading this should treat this as the ground truth for the entire project.

---

## 1. Executive Summary & Philosophy

**Parinay Saree** is a high-performance, strictly serverless static web application for the luxury ethnic textile market. The business has two core product verticals:
- **Premium Sarees** — sold under the "Parinay Saree / PS" brand
- **Luxury Bedsheets** — sold under the "Skyloom®" brand

The entire system follows a **Zero-Dependency Principle** — no Node.js, no NPM, no React, no Angular, no backend server of any kind. The project runs exclusively on Vanilla HTML5, CSS3, and Modern ES6+ JavaScript, hosted entirely on **GitHub Pages** at zero monthly operational cost. This ensures lifetime longevity, instant portability, and full control without reliance on third-party package ecosystems.

---

## 2. File Structure & Responsibilities

| File | Purpose |
|---|---|
| `index.html` | Main homepage — Hero section, collections overview, features section, OG meta tags |
| `sarees.html` | Full Saree product listing — sort bar, badge filter, product count, back-to-top, OG tags |
| `bedsheets.html` | Full Bedsheet product listing — identical feature set to sarees.html |
| `admin.html` | Browser-based Admin CMS dashboard — login UI, metric dashboard, all control panels |
| `admin.js` | All admin logic — GitHub API, product CRUD, image pipeline, bulk ops, preview, cleanup |
| `components.js` | Shared UI — navbar, footer, product cards, modals, cart, checkout, helpers |
| `styles.css` | Global CSS design system — colors, typography, layout, animations |
| `admin.css` | Admin-only styling |
| `data.json` | **Live production database** — all products, site config. Hosted in GitHub repo. |
| `translations.js` | English/Hindi translation string map |
| `language.js` | Language detection and switcher logic |
| `assets/` | All uploaded images: `assets/sarees/`, `assets/bedsheets/`, `assets/banners/` |
| `context.md` | This file — the engineering reference guide |

---

## 3. Data Architecture (data.json)

`data.json` is the single source of truth for the entire website. It is a structured JSON file stored in the GitHub repository root and fetched at runtime via the GitHub REST API. It is **never served as a static file directly** — always fetched through the API to enable cache-busting.

### 3.1 site_config Block

Controls all global website settings — covers, titles, subtitles, delivery, WhatsApp:

```json
{
  "site_config": {
    "hero_cover": "assets/banners/hero.jpg",
    "hero_title": "Utsav Collection 2025",
    "hero_subtitle": "Where tradition meets elegance",
    "sarees_cover": "assets/banners/sarees.jpg",
    "sarees_title": "Premium Sarees",
    "sarees_subtitle": "Handpicked collection",
    "bedsheets_cover": "assets/banners/bedsheets.jpg",
    "bedsheets_title": "Skyloom Bedsheets",
    "bedsheets_subtitle": "Luxury sleep starts here",
    "delivery_value": "Free Delivery",
    "whatsapp_number": "919876543210"
  }
}
```

**`delivery_value`** can be either a string like `"Free Delivery"` or a numeric string like `"50"`. The `getDeliveryCost()` helper in `components.js` detects this with `parseFloat()` and handles both cases.

### 3.2 products Block

All products stored under `products.sarees[]` and `products.bedsheets[]`. Each product object:

```json
{
  "id": "p1712345678901",
  "name": "Banarasi Silk Saree",
  "price": "₹4500",
  "image": "assets/sarees/banarasi.jpg",
  "more_images": ["assets/sarees/banarasi-2.jpg"],
  "stock": 5,
  "discount": 15,
  "badge": "sale",
  "description": "Handwoven Banarasi silk...",
  "style": "",
  "status": "live",
  "dateAdded": "2025-04-08T10:00:00.000Z"
}
```

#### Full Product Field Reference:
- **`id`**: Unique identifier — `'p' + Date.now()`. Used for deep-link URL hashes.
- **`name`** / **`price`** / **`description`**: Core retail metadata. Price is stored as a string including the ₹ symbol.
- **`image`**: Relative path to the primary cover photo (e.g., `assets/sarees/1234_name.webp`). Always relative to repo root.
- **`more_images`**: Array of additional gallery photo paths — displayed in the detail modal's image carousel.
- **`stock`**: Integer stock count. Products where `stock <= 0` are marked "Out of Stock" visually — overlay buttons are hidden and the card gets an `out-of-stock` CSS class.
- **`discount`**: Percentage discount from 0–100. Displayed as a badge and used to calculate MRP strikethrough price.
- **`badge`**: Optional marketing label — `""` (none), `"new"`, `"sale"`, `"trending"`. Rendered as a colored top-right badge on product cards.
- **`status`**: Controls customer-facing visibility:
  - `"live"` — visible to all customers on the product pages.
  - `"hidden"` — invisible to customers but retained in data.json for possible re-activation.
  - `"archived"` — invisible to customers; treated as soft-deleted, retained for records.
  - **IMPORTANT**: `sarees.html` and `bedsheets.html` filter products at runtime: `(data.products.sarees || []).filter(p => !p.status || p.status === 'live')`. Products without a status field are treated as `live` for backward compatibility with old data.
- **`dateAdded`**: ISO 8601 timestamp of product creation — stored but display/sort UI not yet implemented.
- **`style`**: Optional inline CSS string applied to the product card image (e.g., `"object-position: top"`). Rarely used.

---

## 4. Frontend Architecture (components.js)

The frontend uses a custom Web Components approach combined with ES6 template literals for dynamic rendering. All pages share the following building blocks from `components.js`.

### 4.1 Web Components
- **`<site-navbar>`**: Renders the global top navigation bar including logo, search, cart icon, and language toggle.
- **`<site-footer>`**: Renders the global footer with WhatsApp contact link, category navigation, and brand description.

### 4.2 Centralized Helpers (added in V4 audit)

All shared utility functions are defined at the top of the helpers block in `components.js`:

#### `getDeliveryCost()` — Centralized Delivery Calculator
Previously duplicated verbatim in both `openCart()` and `confirmOrder()`. Now extracted into a single function:
```javascript
function getDeliveryCost() {
    const dv = (window.siteConfigData && window.siteConfigData.delivery_value) ? window.siteConfigData.delivery_value : '';
    const num = parseFloat(dv);
    if (!isNaN(num) && num > 0) return { cost: num, text: '₹' + num.toLocaleString('en-IN') };
    return { cost: 0, text: dv || 'Free Delivery' };
}
```
Returns `{ cost: number, text: string }`. Both cart display and WhatsApp checkout use this.

#### `PS_LOGO` / `SKYLOOM_LOGO` — Logo Path Constants
```javascript
const PS_LOGO      = 'assets/ps-logo-compressed.png';
const SKYLOOM_LOGO = 'assets/skyloom-logo.png';
```
Previously hardcoded in 4 places (product card, detail modal — each for saree and bedsheet). Now both `buildProductCard()` and `showProductDetails()` reference these constants. If logos are ever renamed, only these two lines need changing.

#### `window.siteData` — Shared Data Object
`components.js` fetches `data.json` once on page load and exposes the full result as `window.siteData`. It also fires a `siteDataReady` custom event on the window after the fetch resolves:
```javascript
window.siteData = null;
if (!window.location.pathname.includes('admin')) {
    fetch('data.json?v=' + new Date().getTime(), {cache: 'no-store'})
        .then(r => r.json())
        .then(d => {
            window.siteConfigData = d.site_config;
            window.siteData = d;
            let fab = document.getElementById('whatsapp-fab');
            if (fab) fab.href = `https://wa.me/${d.site_config.whatsapp_number || '919876543210'}`;
            window.dispatchEvent(new Event('siteDataReady'));
        }).catch(e => {});
}
```
**Notice the admin guard**: The fetch is entirely skipped on `admin.html` because the admin manages its own authenticated GitHub API fetch — running an unauthenticated public fetch there is wasteful and redundant.

### 4.3 Data Sharing Between components.js and Product Pages

`sarees.html` and `bedsheets.html` previously each fetched `data.json` independently (causing **2 network requests per page**). After the V4 audit, they now reuse `window.siteData`:

```javascript
function loadData() {
    if (window.siteData) {
        applyData(window.siteData);          // Already loaded — use immediately
    } else {
        window.addEventListener('siteDataReady', () => applyData(window.siteData), { once: true });
    }
}
```
This reduces every product page from 2 fetches to 1. `index.html` applies the same pattern for `loadHomeData()`. **Result: 1 network request per page instead of 2.**

### 4.4 buildProductCard(product, category)
Primary product rendering function. Generates a full product card DOM element with:
- Lazy-loaded cover image (`loading="lazy"`).
- Discount badge overlay (top-left) and marketing badge (top-right).
- Pricing block with MRP strikethrough calculated via CSS superscript scaling.
- **Branded logo** auto-inserted based on category — `PS_LOGO` for sarees, `SKYLOOM_LOGO` for bedsheets.
- "Add to Cart" and "WhatsApp Order" overlay buttons on hover (hidden if out of stock).
- Click handler that opens `showProductDetails()`.

### 4.5 showProductDetails(product, isSaree)
Opens a full-screen modal with:
- Multi-image carousel with dot pagination and left/right arrow navigation.
- **Arrow buttons now have `tabindex="0"`, `aria-label`, and a maroon border focus ring** on keyboard focus (V4 accessibility improvement).
- Full description, price with discount, stock status.
- "Share / Copy Link" with silent UI feedback — button text changes to "✓ Copied!" without popups.
- Deep-link support: updates URL hash (`#productId`) for shareable direct links.

### 4.6 Cart, Checkout & WhatsApp Order Flow
- Cart state is stored in `localStorage` under `parinay_cart`.
- Checkout calculates: `subtotal + GST (5%) + deliveryCost` using `getDeliveryCost()`.
- Final order is formatted as a WhatsApp message URL and opened in a new tab.
- After order, cart is cleared from localStorage.

---

## 5. Admin Panel Architecture (admin.html + admin.js)

The Admin Panel is a fully self-contained, browser-based CMS requiring no backend server. It communicates directly with the **GitHub REST API** using a Personal Access Token (PAT).

### 5.1 Shared Constants at Top of app Object

Added in V4 audit — eliminates repeated inline objects scattered across the file:

```javascript
STATUS_COLORS: { live: '#276749', hidden: '#975a16', archived: '#742a2a' },
STATUS_DOT:    { live: '#38a169', hidden: '#d69e2e', archived: '#e53e3e' },
STATUS_ICONS:  { live: '🟢', hidden: '🟡', archived: '🔴' },
TAB_COLORS:    { all: '#7B1338', live: '#276749', hidden: '#975a16', archived: '#742a2a' },
```
All status badge coloring, radio button styling, and tab highlighting now reference these objects instead of hardcoded hex values.

### 5.2 Centralized GitHub API Helper (_ghFetch)

Added in V4 audit — **every** GitHub Contents API call in `admin.js` now goes through this single function instead of repeating the full `fetch()` boilerplate 6 separate times:

```javascript
_ghFetch(path, opts = {}) {
    const { bust, ...rest } = opts;
    const base = `https://api.github.com/repos/${this.auth.username}/${this.auth.repo}/contents/`;
    const url  = base + path + (bust ? `?ts=${Date.now()}` : '');
    return fetch(url, {
        ...rest,
        headers: {
            'Authorization': `token ${this.auth.token}`,
            'Content-Type': 'application/json',
            ...(rest.headers || {})
        },
        cache: bust ? 'no-store' : rest.cache
    });
},
```
- `bust: true` → appends `?ts=timestamp` for cache-busting GET requests.
- `method: 'PUT'` / `method: 'DELETE'` → passed through for write operations.
- **All 6 call sites** (login, compressAndUpload, deleteFileFromGitHub, saveChanges, cleanupOrphanImages scan) use `this._ghFetch()`.

### 5.3 Authentication Flow (app.login)
1. Admin enters GitHub Username, Repo Name, and Personal Access Token (PAT).
2. `_ghFetch('data.json', { bust: true })` fetches `data.json`.
3. Response `sha` is stored in `app.fileSha` — **required for all subsequent PUT writes**.
4. Base64 content decoded via: `decodeURIComponent(escape(window.atob(content)))` + BOM-strip (slice from first `{` to last `}`).
5. `app.data` now holds the full in-memory database.
6. `resetAndRender()` is called once — it internally calls `renderProducts()` which calls `updateMetrics()`. **The double `updateMetrics()` call that existed in V3 has been removed.**

### 5.4 Commit Strategy (app.saveChanges)
Changes are only written to GitHub when "Commit Changes" is clicked:
- All edits modify `app.data` in memory only until then.
- On commit: `JSON.stringify(app.data)` → Base64 → PUT via `_ghFetch('data.json', { method: 'PUT', body: ... })`.
- After success, `app.fileSha` updated with new SHA from response.
- **After a successful commit, `localStorage.removeItem('parinay_preview_data')` is called** to clear any preview data — the live site now matches what was committed.

### 5.5 Image Upload Pipeline (app.compressAndUpload)

Complete V4 rewrite of the compression function — major improvements over V3:

#### Category-Aware Size Limits
```
Product images (sarees/bedsheets): max 150KB
Banner images (banners):           max 250KB
```
V3 had a flat 99KB limit for everything — too aggressive for e-commerce product photography where fabric texture detail is critical.

#### WebP Format When Supported (50-60% smaller)
```javascript
const supportsWebP = testCanvas.toDataURL('image/webp').startsWith('data:image/webp');
const format = supportsWebP ? 'image/webp' : 'image/jpeg';
const ext    = supportsWebP ? 'webp' : 'jpg';
```
97%+ of modern browsers support WebP encoding. A 150KB JPEG is typically 70KB as WebP at the same visual quality. This halves repository asset size over time. The file extension in the saved filename is set to `.webp` or `.jpg` to match the actual format encoded.

#### Category-Aware Max Dimensions
```
Banners: max 1600px (shown full-width)
Products: max 900px (shown in grid cards, sufficient for detail modal)
```
V3 used 1200px for all — 900px saves ~44% file size vs 1200px for product images.

#### Fine-Step Quality Loop (async, non-blocking)
```javascript
const qualities = [0.92, 0.88, 0.84, 0.80, 0.75, 0.70, 0.64, 0.58, 0.50, 0.42, 0.35, 0.28];
for (const q of qualities) {
    out = canvas.toDataURL(format, q);
    await new Promise(r => setTimeout(r, 0)); // yield to UI thread between steps
    if (out.length * 0.75 <= maxBytes) break;
}
```
V3 used a `while` loop decrementing by 0.05 — blocking the main thread and causing visible UI freezes on large images. The new `for...of` with `await setTimeout` yields between each quality step.

#### Post-Resize Laplacian Sharpening
After `canvas.drawImage()` (which uses bilinear interpolation that blurs fine patterns), a Laplacian unsharp-mask pass is applied:
```javascript
function applySharpening(ctx, w, h, amount = 0.22) {
    const imageData = ctx.getImageData(0, 0, w, h);
    // Laplacian 3x3 kernel applied per pixel to recover sharpness
    ctx.putImageData(imageData, 0, 0);
}
```
This restores fabric weave, silk sheen, and thread pattern sharpness lost during downscaling. Critical for product photography where texture is a key purchase signal.

### 5.6 Status Management System

#### Three-State Product Status (MCQ Radio Buttons)
Every product has a `status` field: `live`, `hidden`, or `archived`.

In the **Add Product** form and **Edit Product** modal, status is selected via styled radio buttons that behave like MCQ options:
- Each option is a full-width `<label>` with a colored border and background.
- Active selection highlighted with the status color (`STATUS_DOT` constant).
- When selection changes, `_highlightStatusLabel(selectedVal)` updates all three label borders.
- **`_highlightStatusLabel` now uses `this.STATUS_DOT` constants** instead of a local inline object.

#### Status Filter Tabs
Above the product list in the Manage Products panel, four tab buttons filter the list view:
- **All** (maroon `#7B1338`)
- **🟢 Live** (green `#276749`)
- **🟡 Hidden** (amber `#975a16`)
- **🔴 Archived** (dark red `#742a2a`)

Tabs show live product counts in parentheses (e.g., "Live (12)").

**Important implementation detail — double-call fix (V4):**
`_updateTabUI()` was previously called twice on every tab click:
1. At the start of `setStatusTab()`.
2. Again inside `renderProducts()`.

Fix: `renderProducts()` now accepts a `skipTabUI = false` parameter. When `setStatusTab()` calls it, it passes `skipTabUI = true`:
```javascript
setStatusTab(tab) {
    // ...
    this._updateTabUI();        // called once here
    this.renderProducts(true);  // passes true = skip internal _updateTabUI call
},
renderProducts(skipTabUI = false) {
    if (!skipTabUI) this._updateTabUI();
    // ...
}
```

#### Real Index Mapping
When products are filtered by status tab, the visible list is a subset of the full array. Edits and deletes must target the **real index** in `data.products[category]`, not the filtered-subset index. The render function maps filtered results back to real indices:
```javascript
const indexedFiltered = filtered.map(p => ({ prod: p, realIndex: all.indexOf(p) }));
```

### 5.7 Bulk Operations

The bulk actions bar allows selecting multiple products via checkboxes and applying one of 11 operations:

| Action | Operation |
|---|---|
| 🟢 Set Status: Live | Sets `status: 'live'` on all selected |
| 🟡 Set Status: Hidden | Sets `status: 'hidden'` on all selected |
| 🔴 Set Status: Archived | Sets `status: 'archived'` on all selected |
| 🏷 Apply 10% / 20% / 25% / 50% Discount | Sets `discount` on all selected |
| ✖ Remove Discount | Sets `discount: 0` on all selected |
| 🟢/🔴/🟣 Set Badge | Sets `badge` to `new`, `sale`, or `trending` |
| ✖ Remove Badge | Clears badge to `""` |
| 📦 Mark Out of Stock | Sets `stock: 0` on all selected |
| 🗑 Bulk Delete | Removes all selected products; fires `deleteFileFromGitHub()` for each image |

### 5.8 Product List Pagination
- Default page size: 20 products per load.
- "Load Next 20 Products" button appears when more products exist.
- `currentPage` counter incremented on each load. Reset to 1 on category switch or tab change.
- Pagination operates on the **filtered** list (post-status-tab), not the full array.

### 5.9 Preference Modal (Drag-and-Drop Reorder)
A "Preference" button opens a modal showing all products in the current category as small thumbnail icons. Products can be dragged and dropped to reorder. On drop, the `data.products[category]` array is spliced to move the item to its new position. This is the **only** way to reorder products — the main product list is not draggable to prevent accidental ordering changes.

### 5.10 Image Safety Check (app.deleteFileFromGitHub)

Before deleting any image file from GitHub, a three-layer check confirms the file is unused:
1. **External URL Guard**: Paths starting with `http` or `//` are skipped (can't delete external images).
2. **site_config Check**: If any value in `site_config` equals the path, it's in use as a banner/cover — skip.
3. **Products Check**: Scans every product in every category's `image` and `more_images` arrays.

Only if all three checks pass does the function proceed with the GitHub DELETE API call.

### 5.11 Admin Header Buttons (V4 additions)

The admin header bar now has three buttons:

```
[ 👁 Preview Changes ]  [ 🧹 Cleanup Images ]  [ Commit Changes to GitHub ]
```

All three are grouped in a flex row.

---

## 6. Preview Changes Feature (V4 New Feature)

### How It Works
The Preview feature lets the admin see exactly how uncommitted in-memory changes will look on the live product pages **before** committing to GitHub.

**Technical mechanism — `localStorage` as the transport layer:**

`localStorage` is shared across all tabs on the same origin (same domain). So:
1. Admin makes edits to products, status, prices, etc. in `app.data` (in memory).
2. Admin clicks **👁 Preview Changes**.
3. `app.previewChanges()` writes `JSON.stringify(app.data)` to `localStorage('parinay_preview_data')`.
4. A modal appears with three page options to preview: Sarees, Bedsheets, or Home.
5. The selected page opens in a new tab with `?preview=1` in the URL.
6. On the product page, `loadData()` detects `?preview=1`:
   ```javascript
   const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';
   if (isPreview) {
       const data = JSON.parse(localStorage.getItem('parinay_preview_data'));
       // Show yellow preview banner
       applyData(data);
       return;
   }
   ```
7. A prominent yellow banner is shown: `"⚠️ PREVIEW MODE — These changes are not published yet."` with a dismiss button.
8. When the admin commits successfully (`saveChanges()`), `localStorage.removeItem('parinay_preview_data')` is called automatically — the preview data is cleared since the live site now matches.

### What Can Be Previewed
| Can Preview | Cannot Preview |
|---|---|
| Product status changes (live/hidden/archived filtering) | Images uploaded in this session (they upload immediately to GitHub — see image pipeline notes) |
| Price, discount, badge edits | — |
| New products added | — |
| Product order changes | — |
| Hero/cover title and subtitle changes | — |

### Why Images Upload Immediately (Architectural Constraint)
Images cannot be staged like `data.json` because:
1. The browser cannot write files to local disk — a `File` object only lives in RAM for the session.
2. The product needs a real GitHub URL in its `image` field the moment it's added — a dead path would break the product record.
3. `deleteFileFromGitHub` relies on images being real committed files with a GitHub SHA.

This means if an admin uploads an image but cancels without committing, the image becomes an orphan on GitHub (referenced nowhere in `data.json`). This is solved by the Cleanup Images feature.

---

## 7. Cleanup Orphan Images Feature (V4 New Feature)

### Purpose
When a product is added with images but the session ends before committing, or when images are replaced during editing, the old images remain as unreferenced files in the GitHub repository. Over time these accumulate and waste repository storage.

### How It Works (`app.cleanupOrphanImages()`)

1. Builds a `Set` of all image paths currently referenced anywhere in `app.data`:
   - All values in `site_config` that start with `assets/`
   - All `product.image` paths
   - All entries in every `product.more_images` array

2. Lists all files in `assets/sarees/`, `assets/bedsheets/`, and `assets/banners/` via GitHub Contents API:
   ```javascript
   const res = await this._ghFetch('assets/sarees');
   const files = await res.json(); // array of { name, path, sha, type }
   ```

3. Any file whose `path` is NOT in the `referenced` Set is an orphan.

4. Shows an `alert()` listing all found orphans with a confirmation prompt.

5. For each orphan, calls **`this.deleteFileFromGitHub(path)`** — the existing delete function that handles SHA-fetch, the safety check, and the DELETE API call. **No custom DELETE logic is duplicated** — the cleanup function reuses the established pattern.

6. Shows a completion toast: `"🧹 Done! Orphan cleanup complete."`

---

## 8. Product Pages — Sort, Filter & Count (V4 New Features)

Both `sarees.html` and `bedsheets.html` have a sticky filter bar directly below the navbar:

### Sort Options
- **Default** — original order from `data.json`
- **Price: Low to High** — sorts by numeric price ascending
- **Price: High to Low** — sorts by numeric price descending

Price parsing strips all non-numeric characters before comparing: `parseFloat(String(p.price).replace(/[^0-9.]/g, ''))`.

### Badge Filter
- **All** — no filter
- **New** — products where `badge === 'new'`
- **Sale** — products where `badge === 'sale'`
- **Trending** — products where `badge === 'trending'`

### Product Count Display
A live count updates every time filters change or "Load More" is clicked:
```
"Showing 12 of 47 products"
```
Shows `0 products found` when filters return nothing.

### Implementation Pattern
`applyFilters()` runs on every sort/badge change. It creates a new `filteredProducts` array from `allProducts` (the raw live products list), resets `currentlyShown = 0`, clears the grid, and calls `loadMore()`. The `loadMore()` function operates on `filteredProducts`, not `allProducts`.

---

## 9. Back to Top Button (V4 New Feature)

Both product pages have a fixed back-to-top button that appears after scrolling 400px:

```javascript
window.addEventListener('scroll', () => {
    const btn = document.getElementById('back-to-top');
    if (btn) btn.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });
```

- Uses `opacity: 0` / `opacity: 1` transition (not `display: none`) for a smooth fade-in.
- `passive: true` on the scroll listener avoids blocking the scroll thread.
- Has a hover `translateY(-3px)` micro-animation.
- `pointer-events: none` when invisible — doesn't interfere with clicking through it.

---

## 10. Open Graph Meta Tags (V4 New Feature)

All three public-facing pages now have full OG + Twitter Card meta tags for WhatsApp and social media sharing previews:

```html
<meta property="og:type"        content="website">
<meta property="og:site_name"   content="Parinay Saree">
<meta property="og:title"       content="Parinay Saree - Premium Sarees & Home Linens">
<meta property="og:description" content="...">
<meta property="og:url"         content="https://parinaysaree.in/">
<meta property="og:image"       content="assets/saree.png">
<meta name="twitter:card"       content="summary_large_image">
```

Each page has unique, page-specific OG content:
- `index.html` → general store description, `og:image` = `assets/saree.png`
- `sarees.html` → saree-specific description, `og:image` = `assets/saree.png`
- `bedsheets.html` → bedsheet-specific description, `og:image` = `assets/bedsheet.png`

---

## 11. Accessibility — Carousel Keyboard Navigation (V4 Fix)

The product detail modal's image carousel arrow buttons previously had no keyboard accessibility indicators. In V4:

- Both `‹` (Previous) and `›` (Next) buttons now have:
  - `tabindex="0"` — makes them reachable via Tab key
  - `aria-label="Previous image"` / `aria-label="Next image"` — for screen readers
  - `onfocus` / `onblur` handlers — show a maroon `var(--primary-color)` border ring on focus, remove on blur
  - `border: 2px solid transparent` — provides the space for the focus ring without layout shift

---

## 12. Design & Branding Language

| Token | Value | Usage |
|---|---|---|
| Primary Color | `#7B1338` | Deep Maroon — headings, buttons, borders, admin accents |
| Accent Color | `#B08D57` | Warm Gold — highlights, decorative accents |
| Text Dark | `#2c2c2c` | Body text and product names |
| Background | `#f9f5ef` | Warm off-white page background |

- **Typography**: Google Fonts — `Outfit` (English, all weights 300–700) + `Noto Sans Devanagari` (Hindi, weights 400–700).
- **Branding Rule**: Sarees → `PS_LOGO` (`assets/ps-logo-compressed.png`) at 48px on cards, 54px in modals. Bedsheets → `SKYLOOM_LOGO` (`assets/skyloom-logo.png`) at 65px on cards, 80px in modals.
- **Price Rendering**: ₹ symbol at reduced CSS `font-size`, not `<sup>` tag (which causes baseline misalignment).

---

## 13. Key Engineering Decisions & Rationale

### Why no backend?
GitHub Pages is free, globally CDN-distributed, and auto-deploys on push. The GitHub REST API serves as a perfectly adequate serverless backend for a small-to-medium retail catalog. A backend would add monthly cost, authentication complexity, and a permanent maintenance surface.

### Why is _ghFetch centralized?
Raw GitHub fetch calls (URL construction + auth header + Content-Type) appeared 6 times across admin.js before V4. Every change to the repo URL pattern, token handling, or caching strategy would require 6 identical edits. Centralizing into `_ghFetch` makes the entire GitHub interaction surface a single, auditable function.

### Why cache-bust with timestamps?
GitHub CDN caches file content aggressively at edge nodes. Without `?ts=timestamp`, the admin could read a stale `data.json` for hours after a commit and overwrite newer changes with old data. `_ghFetch(path, { bust: true })` appends the timestamp and sets `cache: 'no-store'`.

### Why Base64 + BOM stripping?
GitHub API returns file content as Base64. On decode, invisible characters (UTF-8 BOM `\uFEFF`, zero-width spaces) can appear at the start, breaking `JSON.parse`. The decode chain `decodeURIComponent(escape(window.atob(...)))` + slicing from `{` to `}` is the robust, battle-tested solution.

### Why don't images stage like data.json for preview?
Images need to be real, committed GitHub files immediately because:
1. Browsers can't write to local disk — the `File` object only exists in RAM for the session duration.
2. The product record needs a real, resolvable URL in its `image` field at creation time.
3. `deleteFileFromGitHub` relies on files having a GitHub SHA for safe deletion.
The trade-off is occasional orphan images, solved by the cleanup feature.

### Why keep sarees.html and bedsheets.html separate?
They are nearly identical HTML files, which tempts a single `collection.html?type=sarees` approach. This was evaluated and rejected because:
1. **URL breakage**: Existing bookmarks and WhatsApp-shared links point to `/sarees.html`. A rename causes 404s.
2. **SEO regression**: Each page has unique `<title>`, OG tags, and structured data that search crawlers index without JS execution.
3. **Natural divergence**: Sarees and bedsheets will naturally diverge in badge types, filter options, and layout details as the catalog grows.
4. **No real DRY gain**: Shared logic lives in `components.js`. The HTML files are just page declarations.

### Why not stage images for preview?
If images were held in browser memory (as base64) and only uploaded on commit:
- **Tab crash = total data loss** — all unsaved images would vanish permanently.
- **Commit becomes a multi-step failure point** — N image uploads + 1 data.json PUT = N+1 points of failure.
- **Pre-defined paths are fragile** — if an upload fails, data.json commits a dead image link.
- **Memory pressure** — 10 products × 2 images × 200KB/image = 4MB+ of base64 strings in JS heap.
The current approach (immediate upload) is simpler and more resilient. Orphans are cleaned on demand.

---

## 14. V4 Code Audit — Changes Made

### Bugs Fixed
| File | Issue | Fix |
|---|---|---|
| `index.html` | `<meta charset http-equiv>` combined on one tag — invalid HTML | Split into two separate `<meta>` tags |
| `components.js` | `#cart-drawer-overlay` removed in ESC handler — element never existed | Removed dead DOM removal call |
| `admin.js` | `updateMetrics()` called twice on login (directly + via `renderProducts`) | Removed the redundant explicit call |
| `admin.js` | `_updateTabUI()` called twice per tab click (in `setStatusTab` + in `renderProducts`) | `renderProducts(skipTabUI = false)` parameter added |
| `admin.js` | `saveChanges()` still using raw `fetch()` instead of `_ghFetch()` | Replaced with `_ghFetch('data.json', { method: 'PUT', ... })` |

### Centralization Applied
| What | Saves |
|---|---|
| `getDeliveryCost()` helper | ~14 lines duplicated in `openCart()` and `confirmOrder()` |
| `_ghFetch()` GitHub helper | ~4–5 lines repeated 6 times across admin.js |
| `STATUS_COLORS`, `STATUS_DOT`, `STATUS_ICONS`, `TAB_COLORS` | Inline color objects repeated 5+ times |
| `PS_LOGO`, `SKYLOOM_LOGO` constants | 4 hardcoded identical strings |
| `window.siteData` shared object | 1 extra `data.json` network request eliminated per page |
| Admin page guard on `components.js` fetch | 1 wasted unauthenticated fetch eliminated on admin page load |

### Image Compression Improvements
| Old | New |
|---|---|
| 99KB flat limit | 150KB (products) / 250KB (banners) |
| Always JPEG | WebP when supported (97%+ browsers), JPEG fallback |
| 1200px max dimension | 900px (products) / 1600px (banners) |
| 0.05 quality step `while` loop — blocking | 12-point preset list with `await setTimeout(0)` yield |
| No post-resize processing | Laplacian unsharp-mask sharpening pass (amount = 0.22) |
| Old extension kept in filename | Extension auto-set to `.webp` or `.jpg` to match encoded format |

---

## 15. Feature Implementation Status

| Feature | Status |
|---|---|
| Sarees product listing with sort/filter/count | ✅ Live |
| Bedsheets product listing with sort/filter/count | ✅ Live |
| Back to top button on product pages | ✅ Live |
| OG + Twitter Card meta tags on all pages | ✅ Live |
| Product detail modal with keyboard-accessible carousel | ✅ Live |
| WhatsApp checkout with GST + delivery calc | ✅ Live |
| Admin GitHub login & auth | ✅ Live |
| Admin image upload — WebP + sharpening + async | ✅ Live |
| Admin Edit Product modal with status MCQ | ✅ Live |
| Admin Delete Product (with 3-layer image safety) | ✅ Live |
| Cover Photo & Title/Subtitle config | ✅ Live |
| Shifting Preference drag-and-drop reorder modal | ✅ Live |
| Product Status (Live/Hidden/Archived) — admin & frontend | ✅ Live |
| Status Filter Tabs with live counts | ✅ Live |
| Bulk Actions (11 operations) | ✅ Live |
| Metric Dashboard | ✅ Live |
| Pagination (Load More, 20 per page) | ✅ Live |
| Preview Changes (localStorage + ?preview=1 URL flag) | ✅ Live |
| Cleanup Orphan Images | ✅ Live |
| `_ghFetch()` centralized API helper | ✅ Live |
| `getDeliveryCost()` centralized helper | ✅ Live |
| `PS_LOGO` / `SKYLOOM_LOGO` constants | ✅ Live |
| `window.siteData` shared — 1 fetch per page | ✅ Live |
| Admin page fetch guard in components.js | ✅ Live |
| `siteDataReady` custom event system | ✅ Live |
| `loading="lazy"` on collection card images | ✅ Live |

---

## 16. Developer Rules & Constraints (Mandatory for All AI)

1. **Zero Dependencies**: Never introduce `package.json`, `npm install`, jQuery, Lodash, or any UI kit. No exceptions.
2. **Vanilla Forever**: Use native browser APIs only — `fetch`, `FileReader`, `Canvas`, `localStorage`, `Web Components`.
3. **Never Hardcode Secrets**: GitHub PAT is entered at runtime. Never embed tokens in any file.
4. **Cache Bust Reads**: Always use `_ghFetch(path, { bust: true })` or `?timestamp=` for any `data.json` GET. Never read without cache-busting.
5. **JSON Safety**: Always decode via `decodeURIComponent(escape(window.atob(...)))` + BOM-strip. Never use raw `JSON.parse` on GitHub API response.
6. **SHA Discipline**: Always read the latest `fileSha` before any PUT commit. Stale SHAs cause `409 Conflict`.
7. **Image Safety**: Never delete a GitHub image without running `deleteFileFromGitHub()` which includes the 3-layer inUse check.
8. **No Node Build Step**: All files are served as-is. No bundler, no transpiler, no minification pipeline.
9. **Use Existing Helpers**: When writing new admin code, always use `_ghFetch()`, `deleteFileFromGitHub()`, `getDeliveryCost()`, `STATUS_COLORS`, `STATUS_DOT`, `PS_LOGO`, `SKYLOOM_LOGO`. Do not re-implement inline.
10. **Status Defaults**: When reading product status, always default to `'live'` if the field is missing — old products in data.json don't have a status field and must be treated as live.
11. **Real Index Mapping**: When iterating a filtered product list in admin, always map back to real indices in the full `data.products[category]` array before editing or deleting.
12. **Preview Cleanup**: After a successful commit, always call `localStorage.removeItem('parinay_preview_data')` to invalidate stale preview data.
