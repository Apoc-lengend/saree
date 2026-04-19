# Parinay Saree — Admin Panel: Complete Developer Reference Guide

> **Target Audience:** App developer implementing a mobile/React Native version of this admin panel.
> **Last Updated:** April 2026
> **Source Files:** `admin.html`, `admin.js`, `admin.css` in the project root.

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Authentication Flow](#2-authentication-flow)
3. [Metrics Dashboard](#3-metrics-dashboard)
4. [Site Configuration Panel](#4-site-configuration-panel)
5. [Add New Product](#5-add-new-product)
6. [Manage Products Panel](#6-manage-products-panel)
7. [Status Filter Tabs](#7-status-filter-tabs)
8. [Search & Sort](#8-search--sort)
9. [Product List & Pagination](#9-product-list--pagination)
10. [Edit Product Modal](#10-edit-product-modal)
11. [Bulk Operations](#11-bulk-operations)
12. [Preference / Drag-and-Drop Reorder Modal](#12-preference--drag-and-drop-reorder-modal)
13. [Image Upload & Compression Pipeline](#13-image-upload--compression-pipeline)
14. [Preview Changes Feature](#14-preview-changes-feature)
15. [Commit Changes to GitHub](#15-commit-changes-to-github)
16. [Cleanup Orphan Images](#16-cleanup-orphan-images)
17. [Export Product List as PDF](#17-export-product-list-as-pdf)
18. [Translations Manager](#18-translations-manager)
19. [GitHub API Layer](#19-github-api-layer)
20. [Data Schema Reference](#20-data-schema-reference)
21. [UX Patterns & UI Conventions](#21-ux-patterns--ui-conventions)
22. [State Management Reference](#22-state-management-reference)
23. [Developer Rules & Constraints](#23-developer-rules--constraints)

---

## 1. Overview & Architecture

The admin panel (`admin.html` + `admin.js`) is a **fully browser-based CMS** with zero server-side requirements. It communicates directly with the **GitHub REST API v3** using a Personal Access Token (PAT).

### Key Design Principles

| Principle | Description |
|---|---|
| **Zero Backend** | No Node.js, no Express, no database. GitHub is the backend. |
| **In-Memory Edits** | All changes edit `app.data` in RAM. Nothing is saved until "Commit Changes" is clicked. |
| **Single Source of Truth** | `data.json` in the GitHub repo is the live DB for both admin and frontend. |
| **Deferred Writes** | Text/product data is staged in memory; only images upload immediately (architectural constraint). |
| **Git Tree Commit** | The commit pipeline uses GitHub's Git Tree API, not individual file-by-file PUT requests — atomic, efficient. |

### Global App State Object

All state lives in a single global object `app`:

```javascript
const app = {
    auth: { username: '', repo: '', token: '' }, // GitHub credentials
    data: null,                  // Full in-memory copy of data.json
    fileSha: '',                 // SHA of data.json (needed for PUT)
    currentPage: 1,              // Current pagination page
    pageSize: 20,                // Products per page
    selectedIndices: new Set(),  // Indices of bulk-selected products
    pendingDeletions: new Set(), // Image paths queued for deletion on next commit
    activeStatusTab: 'all',      // Current status filter tab
    hasUnsavedChanges: false,    // Dirty flag — triggers beforeunload warning
    originalDataText: null,      // JSON string snapshot from last commit (for diff)
    translationsData: {},        // In-memory copy of translations.js
    hasUnsavedTranslations: false,
    translationsFileSha: null,
};
```

---

## 2. Authentication Flow

### UI Layout

The admin starts on a **full-screen login card** (`#auth-screen`) that hides the dashboard until credentials are validated.

```
┌─────────────────────────────────┐
│         Admin Login             │
│   Powered by GitHub Pages API   │
│                                 │
│  GitHub Username  [____________]│
│  Repository Name  [____________]│
│  Personal Access Token [password]│
│                                 │
│      [ Connect to Repository ]  │
└─────────────────────────────────┘
```

### Login Implementation (`app.login`)

**Step-by-step flow:**

1. Read 3 input values: `github-username`, `github-repo`, `github-token`
2. Validate all three are non-empty — `alert()` if not
3. Fetch `data.json` directly from GitHub Contents API with cache-busting timestamp:
   ```
   GET https://api.github.com/repos/{user}/{repo}/contents/data.json?timestamp={Date.now()}
   Headers: Authorization: token {PAT}
   Cache: no-store
   ```
4. On success, store `fileData.sha` → `app.fileSha` (critical for future PUT/commit)
5. Decode the Base64 content:
   ```javascript
   let jsonText = decodeURIComponent(escape(window.atob(fileData.content.replace(/\s/g, ''))));
   ```
6. Strip invisible characters / UTF-8 BOM:
   - Find first `{` → trim everything before it
   - Find last `}` → trim everything after it
7. Parse JSON → `app.data`
8. Save `JSON.stringify(app.data)` → `app.originalDataText` (used later for diff generation)
9. Switch UI: hide `#auth-screen`, show `#dashboard-screen`
10. Call `app.loadTranslations()` to fetch `translations.js`
11. Call `app.populateConfig()` to fill site config fields
12. Call `app.resetAndRender()` → populates product list + metrics

**On failure:** `alert(err.message)` is shown. The dashboard screen is never revealed.

**Escape key listener** is registered after login to close any open modal (`admin-edit-modal`, `admin-pref-modal`).

**`beforeunload` warning** is registered globally — if `app.hasUnsavedChanges` is true, the browser shows a "Leave page?" warning when the admin tries to close the tab.

---

## 3. Metrics Dashboard

### UI

A horizontal grid of colored KPI cards rendered inside `#metric-dashboard` immediately below the header bar. Cards use `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))` for responsive layout.

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ...
│ 📦 Total │ │ 🧣 Sarees│ │🛏 Beds   │ │ 🟢 Live  │
│    47    │ │    28    │ │    19    │ │    40    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Cards Rendered

| Label | Logic | Color |
|---|---|---|
| 📦 Total Products | `sarees.length + bedsheets.length` | Maroon `#7B1338` |
| 🧣 Sarees | `sarees.length` | Gold `#B08D57` |
| 🛏 Bedsheets | `bedsheets.length` | Slate `#4a5568` |
| 🟢 Live | `!p.status \|\| p.status === 'live'` | Green `#38a169` |
| ⚠️ Out of Stock | `p.stock <= 0` | Red `#e53e3e` |
| 🔥 On Sale | `p.discount > 0` | Orange `#dd6b20` |
| 🟡 Hidden | `p.status === 'hidden'` | Amber `#d69e2e` |
| 🔴 Archived | `p.status === 'archived'` | Dark Red `#9b2c2c` |

### Implementation (`app.updateMetrics`)

Called automatically after every `renderProducts()` call. Concatenates card HTML into `#metric-dashboard` using a helper template function `card(label, value, color)`.

Each card: white background, `border-top: 3px solid {color}`, `box-shadow: 0 2px 8px rgba(0,0,0,0.07)`.

---

## 4. Site Configuration Panel

### Purpose

Allows the admin to update all global website settings stored in `data.json → site_config`. Changes are **in-memory only** until committed.

### UI Description

A panel with a `grid-2` layout containing:

#### Section A — Cover Photos & Page Titles

Five cover image pickers, each with:
- A `<label>` styled as a button showing current file path (clickable to trigger hidden `<input type="file">`)
- A title `<input type="text">`
- A subtitle `<textarea>`

| Cover | Config Key | Used On |
|---|---|---|
| Hero Cover | `hero_cover` | `index.html` main hero section |
| Saree Cover | `sarees_cover` | `sarees.html` page header banner |
| Bedsheet Cover | `bedsheets_cover` | `bedsheets.html` page header banner |
| Hero Saree Cover | `home_sarees_cover` | `index.html` collections section |
| Hero Bedsheet Cover | `home_bedsheets_cover` | `index.html` collections section |

#### Section B — Business Settings

| Field | Config Key | Description |
|---|---|---|
| Delivery Rate | `delivery_value` | Either `"Free Delivery"` or a numeric string like `"50"` |
| WhatsApp Number | `whatsapp_number` | Full international format, e.g. `"919876543210"` |

#### Section C — About Section Text

- About Title → `about_title`
- About Subtitle → `about_subtitle`
- Feature 1 Title/Description → `about_f1_title`, `about_f1_desc`
- Feature 2 Title/Description → `about_f2_title`, `about_f2_desc`
- Feature 3 Title/Description → `about_f3_title`, `about_f3_desc`

### Implementation Details

**`app.populateConfig()`** — Reads `app.data.site_config` and fills all input fields on page load.

**`app.updateConfig(key, value)`** — Called on every `onchange` event. Sets `app.data.site_config[key] = value` and calls `app.markChanged()`. No GitHub write happens here.

**`app.uploadConfigImage(key, file, labelId)`** — Called when a file is selected for a cover photo:
1. Shows "Uploading…" in the label
2. Calls `compressAndUpload(file, 'banners')` — compresses to WebP/JPEG ≤250KB and pushes to GitHub's `assets/banners/` folder **immediately**
3. Updates `app.data.site_config[key]` with the returned path
4. Refreshes the label display via `populateConfig()`

> **Note for mobile app:** Config image uploads happen immediately to GitHub (not deferred). Only the `data.json` path reference is staged for the next commit.

---

## 5. Add New Product

### UI Layout

A form panel (`grid-2` layout beside the Manage panel) with the following fields:

```
┌─────────────────────────────────────┐
│ Add New Product                     │
│                                     │
│ Category:   [Sarees ▼]              │
│ Name:       [________________________]│
│ Price:      [________________________]│
│ Stock Qty:  [__1__]                 │
│ Discount (%): [__0__]               │
│ Status: ● 🟢 Live ○ 🟡 Hidden ○ 🔴 Archived │
│ Badge:  [None ▼]                    │
│                                     │
│ ┌────────────────────────────────┐  │
│ │   📁 Upload Front Image        │  │
│ └────────────────────────────────┘  │
│                                     │
│ Description: [textarea]             │
│                                     │
│ ┌────────────────────────────────┐  │
│ │   🖼️ Upload Extra Images       │  │
│ └────────────────────────────────┘  │
│                                     │
│       [ Add Product ]               │
└─────────────────────────────────────┘
```

### Field Details

| Field | Input Type | Validation |
|---|---|---|
| Category | `<select>`: `sarees` / `bedsheets` | Required |
| Product Name | `text` | Required, trimmed |
| Price | `text` | Required; stripped of non-numerics via `parseFloat`. Stored as `"₹{num}"` |
| Stock | `number` | Defaults to 1; `parseInt` |
| Discount | `number` | Defaults to 0; `parseInt` |
| Status | Radio: `live`/`hidden`/`archived` | Defaults to `live` |
| Badge | `<select>`: None / New / Sale / Trending | Optional |
| Front Image | `file` | Required |
| Description | `textarea` | Optional |
| Extra Images | `file` (multiple) | Optional |

### Implementation (`app.addProduct`)

1. Collect and validate all inputs
2. Normalize price: `'₹' + parseFloat(price.replace(/[^0-9.]/g, ''))`
3. Disable button, show "Uploading…"
4. Call `compressAndUpload(mainImageFile, category)` → get stored path
5. Loop through extra image files — `compressAndUpload` each one sequentially
6. Build product object:
   ```javascript
   {
     id: 'p' + Date.now(),
     name, price, image,
     style: '',
     stock: (status === 'archived') ? 0 : stock,  // archived forces stock=0
     discount, badge, description, status,
     more_images: [...paths],
     dateAdded: new Date().toISOString()
   }
   ```
7. Push to `app.data.products[category]`
8. Call `app.markChanged()`
9. Reset all form fields (name, price, desc → `''`; stock → `10`; discount → `0`; badge → `''`; file labels reset; status → `live`)
10. Re-render product list; show toast

> **Important:** Images upload to GitHub immediately during step 4-5. The data.json product entry is only saved to GitHub during the next "Commit Changes".

---

## 6. Manage Products Panel

The right-hand panel in the `grid-2` layout. Contains category selector, search, sort, status tabs, bulk action bar, product list, and load-more button.

### Category Selector

```html
<select id="manage-category" onchange="app.resetAndRender()">
  <option value="sarees">View Sarees</option>
  <option value="bedsheets">View Bedsheets</option>
</select>
```

Changing category calls `resetAndRender()` which resets pagination to page 1, clears selections, resets the tab to "All", and re-renders the list.

### `app.resetAndRender()`

```javascript
resetAndRender() {
    this.currentPage = 1;
    this.selectedIndices.clear();
    this.activeStatusTab = 'all';
    this._syncBulkSelectAll();
    this._updateTabUI();
    this.renderProducts();
}
```

---

## 7. Status Filter Tabs

Four tab buttons that filter the product list by `status` field.

```
┌──────────┬──────────────┬───────────────┬─────────────────┐
│  All(47) │ 🟢 Live (40) │ 🟡 Hidden (4) │ 🔴 Archived (3) │
└──────────┴──────────────┴───────────────┴─────────────────┘
```

### Tab Colors

| Tab | Active Background | Active Text |
|---|---|---|
| All | `#7B1338` (Maroon) | White |
| 🟢 Live | `#276749` (Dark Green) | White |
| 🟡 Hidden | `#975a16` (Amber) | White |
| 🔴 Archived | `#742a2a` (Dark Red) | White |

Inactive tabs: `#f0f0f0` background, `#555` text.

### Implementation

**`app.setStatusTab(tab)`:**
```javascript
setStatusTab(tab) {
    this.activeStatusTab = tab;
    this.currentPage = 1;
    this.selectedIndices.clear();
    this._syncBulkSelectAll();
    this._updateTabUI();
    this.renderProducts();
}
```

**`app._updateTabUI()`** — Updates each tab button's background/color and injects live counts `(n)` into each `#tab-count-{tab}` span.

Count logic:
```javascript
const counts = { all: all.length, live: 0, hidden: 0, archived: 0 };
all.forEach(p => {
    const s = p.status || 'live'; // missing status = live (backward compat)
    if (counts[s] !== undefined) counts[s]++;
});
```

---

## 8. Search & Sort

### Search Bar

- Input: `#manage-search` — `oninput → app.renderProducts()`
- Filters by `(p.name || '').toLowerCase().includes(query)`
- Applied **after** status tab filter: search within the filtered subset

### Sort Dropdown

- Input: `#manage-sort` — `onchange → app.renderProducts()`

| Option | Logic |
|---|---|
| Default Order | No sort — original `data.json` order |
| Recently Added First | `sort((a,b) => new Date(b.prod.dateAdded) - new Date(a.prod.dateAdded))` |
| Oldest First | `sort((a,b) => new Date(a.prod.dateAdded) - new Date(b.prod.dateAdded))` |

Sort is applied **after** status filter and search filter, on the `indexedFiltered` array (which preserves real indices).

---

## 9. Product List & Pagination

### How `renderProducts()` Works

1. Read `category` from `#manage-category`
2. Get all products: `app.data.products[category]`
3. Filter by active status tab
4. Apply search query filter
5. Map each filtered product to `{ prod, realIndex }` — preserves original array index for safe edits/deletes
6. Apply sort
7. Slice to `currentPage * pageSize` → `visibleSlice`
8. Render each product as a `.product-item` div
9. Show/hide `#load-more-btn` based on whether more items exist
10. Call `updateMetrics()`

### Product List Item Structure (per product)

```
┌────────────────────────────────────────────────────┐
│ ☐  [img]●  Product Name  [Live]  [badge?]          │
│             ₹2500  | Stock: 5  | Discount: 10%     │
│             [thumb1] [thumb2]               [Delete]│
└────────────────────────────────────────────────────┘
```

- **Checkbox** (`data-index={realIndex}`) — for bulk selection
- **Image** (52×52px, rounded) with a colored **status dot** (bottom-right corner): 🟢/🟡/🔴
- **Name** in maroon `#7B1338`, bold
- **Status pill** — colored badge matching status
- **Badge pill** — if product has a badge
- **Price | Stock | Discount** — info row in small gray text
- **Extra image thumbnails** — 28×28px for each `more_images` entry
- **Delete button** — red, right-aligned; calls `removeProduct(category, realIndex)`

**Click on row** (not on checkbox or button) → opens `openEditModal(category, realIndex)`

### Pagination

- Default page size: **20 products per load**
- "Load Next 20 Products" button (`#load-more-btn`) — shown only if `visibleSlice.length < indexedFiltered.length`
- `app.loadMoreProducts()` increments `currentPage` and calls `renderProducts()`
- Page resets to 1 whenever: category changes, tab changes, or `resetAndRender()` is called

### Real Index Mapping (Critical)

When products are filtered by tab/search, the visible list is a **subset** of the full array. Edits and deletes must use the **real position** in `data.products[category]`, not the filtered-list position:

```javascript
const indexedFiltered = filtered.map(p => ({ prod: p, realIndex: all.indexOf(p) }));
```

---

## 10. Edit Product Modal

### How to Open

Click anywhere on a product row (except checkbox/delete button). Calls `openEditModal(category, realIndex)`.

### Modal UI

A full-screen overlay (`position: fixed`, `backdrop-filter: blur(4px)`) containing a white card (max-width: 520px, max-height: 92vh, overflow-y: auto):

```
┌─────────────────────────────────────────┐
│ ✕                                       │
│ Edit Product                            │
│                                         │
│ [img 90×90]  [Name Input        ]       │
│              [Price Input       ]       │
│                                         │
│ Stock: [___]    Discount (%): [___]     │
│                                         │
│ Badge: [None ▼]                         │
│                                         │
│ Description: [textarea, resizable]      │
│                                         │
│ Visibility Status:                      │
│ [🟢 Live] [🟡 Hidden] [🔴 Archived]     │  ← MCQ style
│                                         │
│ Additional Images:                      │
│ [img×] [img×] [img×]  [+ Upload More]  │
│                                         │
│ [  Cancel  ]  [  Save Changes  ]        │
└─────────────────────────────────────────┘
```

### Status Radio Buttons (MCQ-style)

Each status option (`live`, `hidden`, `archived`) renders as a full `<label>` block with colored border. The currently selected one has:
- `border: 2px solid {statusColor}`
- `background: {statusColor}18` (8% opacity tint)

Unselected ones: `border: 2px solid #ddd`, `background: white`

When selection changes → `app._highlightStatusLabel(selectedVal)` updates all three borders.

### Saving (`app.saveEditModal(category, index)`)

1. Read all inputs from modal
2. Parse price → `'₹' + parseFloat(...)`
3. `parseInt` for stock and discount
4. Read status radio value
5. **Archived auto-logic:** if `status === 'archived'` → force `prod.stock = 0`
6. Update `app.data.products[category][index]` in memory
7. Call `app.markChanged()`
8. Close modal, re-render product list

### Extra Images Management

- Gallery shown as 60×60px thumbnails with a red `✕` button (top-right corner of each thumb)
- **Remove:** `app.removeExtraImage(category, index, imgIndex)` → confirms, splices from `more_images`, calls `deleteFileFromGitHub(path)`, re-opens modal
- **Upload more:** `<input type="file" multiple>` → `app.uploadExtraImagesForEdit(category, index, files)` → compresses and uploads each file, pushes paths into `more_images`, re-opens modal

---

## 11. Bulk Operations

### UI

A toolbar row above the product list:

```
☐ Select All   [── Bulk Actions ──▼]   [Apply]
```

- **Select All checkbox** — `toggleBulkSelectAll(checked)`: adds all indices to `selectedIndices` set (or clears it)
- `el.indeterminate` state is set when some (not all) are checked
- **Bulk Action dropdown** → grouped options
- **Apply button** → `executeBulkAction()`

### Available Bulk Actions

| Group | Action | Value | Effect |
|---|---|---|---|
| Visibility | 🟢 Set Status: Live | `set_live` | `p.status = 'live'` |
| Visibility | 🟡 Set Status: Hidden | `set_hidden` | `p.status = 'hidden'` |
| Visibility | 🔴 Set Status: Archived | `set_archived` | `p.status = 'archived'` |
| Discounts | 🏷 Apply 10% | `discount_10` | `p.discount = 10` |
| Discounts | 🏷 Apply 20% | `discount_20` | `p.discount = 20` |
| Discounts | 🏷 Apply 25% | `discount_25` | `p.discount = 25` |
| Discounts | 🏷 Apply 50% | `discount_50` | `p.discount = 50` |
| Discounts | ✖ Remove Discount | `remove_discount` | `p.discount = 0` |
| Badges | 🟢 Set Badge: New | `set_badge_new` | `p.badge = 'new'` |
| Badges | 🔴 Set Badge: Sale | `set_badge_sale` | `p.badge = 'sale'` |
| Badges | 🟣 Set Badge: Trending | `set_badge_trending` | `p.badge = 'trending'` |
| Badges | ✖ Remove Badge | `remove_badge` | `p.badge = ''` |
| Inventory | 📦 Mark Out of Stock | `set_stock_zero` | `p.stock = 0` |
| Danger | 🗑 Bulk Delete | `delete` | Splice all selected; queue images for deletion |

### Implementation Notes

- Indices iterated in **descending order** for delete operations so that `splice(idx, 1)` doesn't shift remaining indices
- After any action: `selectedIndices.clear()`, reset checkboxes, `markChanged()`, `renderProducts()`
- Delete action shows `confirm()` before proceeding

---

## 12. Preference / Drag-and-Drop Reorder Modal

### Purpose

Allows the admin to change the **display order** of products on the live website. This is the **only** way to reorder — the main list intentionally doesn't support drag-and-drop to prevent accidental changes.

### How to Open

Click the **"Preference"** button next to the category selector (dark gray button, top of Manage panel).

### Modal UI

Full-screen overlay with a scrollable white card containing a **flex-wrapped grid of 72×72px thumbnail squares**:

```
┌─────────────────────────────────────────────┐
│ Reorder: Sarees                             │
│ Drag and drop thumbnails to reorder...      │
│                                             │
│ [img #1] [img #2] [img #3] [img #4] ...    │
│ [img #5] [img #6] [img #7] ...             │
│                                             │
│                         [ Done ]           │
└─────────────────────────────────────────────┘
```

Each thumbnail:
- `draggable="true"`
- Index label overlay at the bottom: `#1`, `#2`, etc.
- Drag start → sets opacity to 0.4
- Drag over → shows maroon `2px solid #7B1338` outline
- Drag leave → removes outline

### Drop Logic (`app.handleReorderDrop`)

```javascript
const items = this.data.products[category];
const [dragged] = items.splice(sourceIndex, 1);
// Adjust target because splice shifted items
const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
items.splice(adjustedTarget, 0, dragged);
```

After drop: `markChanged()`, re-render product list, show toast, close and re-open the modal (to reflect new order).

---

## 13. Image Upload & Compression Pipeline

### Overview

Every image uploaded (product front, extra, banner config) goes through `app.compressAndUpload(file, category)`. This returns a `Promise<string>` resolving to the stored GitHub path.

### Category-Aware Limits

| Category | Max Size | Max Dimension |
|---|---|---|
| `sarees` / `bedsheets` | 150 KB | 900px |
| `banners` | 250 KB | 1600px |

### Format Detection (WebP vs JPEG)

```javascript
const testCanvas = document.createElement('canvas');
testCanvas.width = testCanvas.height = 1;
const supportsWebP = testCanvas.toDataURL('image/webp').startsWith('data:image/webp');
const format = supportsWebP ? 'image/webp' : 'image/jpeg';
const ext = supportsWebP ? 'webp' : 'jpg';
```

WebP is 50–60% smaller than JPEG at equal visual quality. Supported by 97%+ of modern browsers. File extension in the saved filename matches the actual encoded format.

### Filename Generation

```javascript
const baseName = file.name.replace(/\s+/g, '-').replace(/\.[^.]+$/, '');
const safeName = `${Date.now()}_${baseName}.${ext}`;
const path = `assets/${category}/${safeName}`;
```

### Compression Steps

1. **Size check:** If file is already ≤ maxBytes AND is already WebP (or browser doesn't support WebP) → upload directly without re-encoding
2. **Load into `<img>` element** via `FileReader.readAsDataURL`
3. **Draw onto `<canvas>`** — scale down to maxDim if needed (maintaining aspect ratio)
4. **Apply Laplacian unsharp-mask sharpening** (amount = 0.22) to recover fabric texture detail lost in bilinear downscale:
   ```javascript
   // 3×3 Laplacian kernel per pixel across all RGB channels
   const lap = top + bottom + left + right - 4 * center;
   output = clamp(center - amount * lap);
   ```
5. **Quality loop** — try qualities `[0.92, 0.88, 0.84, 0.80, 0.75, 0.70, 0.64, 0.58, 0.50, 0.42, 0.35, 0.28]` with `await setTimeout(0)` yield between steps (non-blocking):
   ```javascript
   for (const q of qualities) {
       out = canvas.toDataURL(format, q);
       await new Promise(r => setTimeout(r, 0)); // yield to UI thread
       if (out.length * 0.75 <= maxBytes) break;
   }
   ```

### GitHub Upload (within processFile)

1. Attempt GET on the target path — if exists, capture existing SHA
2. Build PUT body: `{ message: "Upload {name}", content: base64, sha?: existingSha }`
3. PUT to `https://api.github.com/repos/{user}/{repo}/contents/{path}`
4. On success → resolve Promise with `path`
5. On failure → reject with error

> **Key architectural fact:** Images are pushed to GitHub **immediately** on selection, before the admin clicks "Commit Changes". This is an intentional architectural trade-off. See Section 14 for why.

---

## 14. Preview Changes Feature

### Purpose

Lets the admin see exactly how their **uncommitted in-memory changes** will look on the live product pages — before publishing to GitHub.

### How It Works

1. Admin makes edits (product status, prices, new products, etc.) in `app.data`
2. Admin clicks **👁 Preview Changes** button in header
3. `app.previewChanges()` runs:
   - `localStorage.setItem('parinay_preview_data', JSON.stringify(app.data))`
   - `localStorage.setItem('parinay_preview_translations', JSON.stringify(app.translationsData))`
4. A modal appears asking which page to preview:

```
┌─────────────────────────────────────┐
│ Preview Uncommitted Changes         │
│ Opens with your current in-memory   │
│ edits. Changes are not published.   │
│                                     │
│  [ 🧣 Preview Sarees Page    ]      │
│  [ 🛏 Preview Bedsheets Page ]      │
│  [ 🏠 Preview Home Page      ]      │
│  [ Cancel                    ]      │
└─────────────────────────────────────┘
```

5. Clicking a button opens `{page}.html?preview=1` in a **new tab**
6. The product page detects `?preview=1`, reads `localStorage('parinay_preview_data')` instead of fetching from GitHub, and renders with that data
7. A **yellow banner** is shown on the preview page: `"⚠️ PREVIEW MODE — These changes are not published yet."`
8. On successful commit → `localStorage.removeItem('parinay_preview_data')` + `localStorage.removeItem('parinay_preview_translations')` — preview data is cleared

### What Can Be Previewed

| Can Preview | Cannot Preview |
|---|---|
| Product status (live/hidden/archived) | Images uploaded in this session (they're already on GitHub) |
| Price, discount, badge edits | — |
| New products added | — |
| Product order changes | — |
| Hero/cover title and subtitle | — |
| Translation changes | — |

### Why Images Can't Be Staged

1. The browser cannot write to local disk — a `File` object only lives in RAM for the session
2. The product record needs a real resolvable URL in its `image` field at creation time
3. `deleteFileFromGitHub` relies on files having a live GitHub SHA

---

## 15. Commit Changes to GitHub

### Trigger

The **"Commit Changes to GitHub"** button in the header bar. Calls `app.saveChanges()`.

### Step 1: Commit Review Modal (`_confirmCommit`)

A modal showing a **diff summary** of all changes since the last commit. The diff is generated by `_generateDiffHTML()`:

- Compares `app.originalDataText` (JSON at last commit) vs current `app.data`
- Shows per-category counts: `+N Added`, `-N Removed`, `✎N Edited`, `⇅N Reordered`
- Shows site config changes by key name
- If no changes detected: shows "No changes detected since last commit."

```
┌──────────────────────────────────────┐
│ Publish Changes                      │
│ You are about to push the current... │
│                                      │
│ ⚙️ Site Settings                    │
│  • Hero Title updated                │
│                                      │
│ 📦 Sarees   +2 Added  ✎1 Edited     │
│  Added: Silk Saree, Banarasi Saree   │
│  Edited: Chiffon Saree               │
│                                      │
│  [  Cancel  ]  [ Yes, Publish Now ]  │
└──────────────────────────────────────┘
```

"Yes, Publish Now" button → locks both buttons (pointer-events: none), shows "Publishing…"

### Step 2: Git Tree Commit (`saveChanges`)

Uses the **Git Tree API** (not individual PUT calls) for an atomic, multi-file commit:

```
1. GET /repos/{user}/{repo}                    → get default_branch
2. GET /repos/{user}/{repo}/git/refs/heads/{branch} → get commitSha
3. GET /repos/{user}/{repo}/git/commits/{commitSha} → get baseTreeSha
4. POST /repos/{user}/{repo}/git/trees          → create new tree with:
      - data.json (updated catalog)
      - p/{id}.html for every product (SEO redirect pages)
      - translations.js (if hasUnsavedTranslations)
      - null sha for each pendingDeletion path (deletes the file)
5. POST /repos/{user}/{repo}/git/commits        → create commit
6. PATCH /repos/{user}/{repo}/git/refs/{branch} → fast-forward branch
```

### SEO Static Pages (auto-generated per commit)

For every product in every category, a static HTML file is written to `p/{product.id}.html`:

```html
<!DOCTYPE html><html><head>
  <meta charset="utf-8">
  <title>{name} - Parinay Saree</title>
  <meta property="og:title" content="{name}">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="{siteUrl}/{product.image}">
  <meta property="og:url" content="{siteUrl}/p/{id}.html">
  <meta property="og:type" content="product">
  <meta name="twitter:card" content="summary_large_image">
  <script>window.location.replace("../{category}.html#{id}");</script>
</head><body><p>Redirecting to product...</p></body></html>
```

These pages exist for **all products regardless of status** — archived/hidden products still have a permanent URL that social media crawlers can index. The JS redirect sends live users to the main category page.

### After Successful Commit

```javascript
this.originalDataText = JSON.stringify(this.data);  // reset diff baseline
this.hasUnsavedChanges = false;
this.hasUnsavedTranslations = false;
this.pendingDeletions.clear();
localStorage.removeItem('parinay_preview_data');
localStorage.removeItem('parinay_preview_translations');
```

Toast: `"✅ Live site updated! GitHub Pages will deploy in ~1 minute."`

### On Failure

`alert('Commit failed: ' + err.message)` — the error message comes directly from GitHub API's error response.

---

## 16. Cleanup Orphan Images

### Purpose

Over time, unreferenced image files accumulate in `assets/` on GitHub when:
- A product is added with images but the session ends before committing
- An image is replaced in the edit modal (old path abandoned)
- A product is deleted but its images failed to delete

### How to Trigger

Click **🧹 Cleanup Images** button in the header bar.

### Implementation (`app.cleanupOrphanImages`)

1. **Build referenced set** — all paths currently in memory:
   - `site_config` values starting with `assets/`
   - Every `product.image`
   - Every entry in every `product.more_images`
2. **Fetch static HTML/JS files** (`index.html`, `styles.css`, `components.js`, `sarees.html`, `bedsheets.html`) — parse them with regex to find hardcoded `assets/…` paths and add those to the referenced set (protects logo files etc.)
3. **Fetch file listings** from GitHub for:
   - `assets/sarees/`
   - `assets/bedsheets/`
   - `assets/banners/`
4. Any file path NOT in the referenced set → orphan
5. If 0 orphans → `alert('✅ No orphan images found!')`
6. Otherwise show `confirm()` listing all orphan paths
7. On confirm → loop and call `deleteFileFromGitHub(path)` for each orphan
8. These get added to `pendingDeletions` — actually deleted on next **Commit Changes**

Toast: `"🧹 Done! Orphans queued. Press Commit Changes to finalize."`

### Image Safety Check (`app.deleteFileFromGitHub`)

This function is the **only** way an image should ever be deleted. It has a 3-layer guard:

```javascript
// Layer 1: Skip external URLs
if (!path || path.startsWith('http') || path.startsWith('//')) return;

// Layer 2: Check site_config
if (Object.values(conf).includes(path)) inUse = true;

// Layer 3: Check all products
for (const arr of Object.values(this.data.products)) {
    for (const prod of arr) {
        if (prod.image === path) { inUse = true; break; }
        if (prod.more_images && prod.more_images.includes(path)) { inUse = true; break; }
    }
}
```

Only if all three pass → path is added to `pendingDeletions`. The actual deletion happens atomically within the Git Tree commit (as `sha: null` entries in the tree).

---

## 17. Export Product List as PDF

### Trigger

Click **📄 Export PDF** button in the header bar.

### Behavior

1. Reads current category + active status tab filter
2. Opens a new browser window/tab (`window.open('', '_blank')`)
3. Writes a fully self-contained, print-ready HTML page with:
   - Branded header (Parinay Saree logo text, date, filter, total count)
   - Product inventory table with: photo, name, ID, price, stock, discount, badge, status, link
   - For **Live** products: "Visit Site ↗" link to the live `p/{id}.html` page
   - For non-Live products: "Link Unavailable" text (grayed out)
4. Auto-triggers `window.print()` after all images load (via `img.complete` check)

### PDF Table Columns

| # | Photo | Product Name | Price | Stock | Discount | Badge | Status | Link |
|---|---|---|---|---|---|---|---|---|

### Print Styles

- `@media print` removes the print button
- `@page { margin: 1.2cm; size: A4 portrait }`
- Tables and rows have `page-break-inside: avoid`
- Alternating row backgrounds, brand-colored table headers

---

## 18. Translations Manager

### Purpose

A bilingual English/Hindi translation dictionary. Allows the admin to map English strings (product names, descriptions, site config text) to Hindi equivalents. The frontend uses this dictionary to switch to Hindi when the user toggles the language.

### Trigger

Click **🌍 Translations** button (indigo, `#5a67d8`) in the header bar.

### UI

A large modal (800px wide, 80vh height) with:

```
┌───────────────────────────────────────────────────────┐
│ Manage Translations          [+ Add New] [Save & Close]│
│                                                       │
│ Edits to this dictionary will instantly sync...       │
│                                                       │
│ 🔍 [Search English or Hindi word...]                  │
│                                                       │
│  [English Text        ]  [Hindi Translation    ]  [🗑] │
│  [English Text        ]  [Add Hindi translation]  [🗑] │  ← red border = missing
│  ...                                                  │
└───────────────────────────────────────────────────────┘
```

Missing translations (empty Hindi value) are highlighted:
- Row background: `#fff5f5`
- Row border: `1px solid #fc8181`
- Hindi input: `border: 2px solid #fc8181; box-shadow: 0 0 4px rgba(252,129,129,0.5)`

Items with translations: normal `#f9f9f9` background.

**Sort order:** Missing translations float to the top (pinned), then alphabetical.

### Dynamic String Discovery (`app.getDynamicAppStrings`)

The admin doesn't have to manually add every string. The system auto-discovers translatable strings from:
- All `site_config` text fields (`hero_title`, `sarees_title`, `about_f1_desc`, etc.)
- All `product.name` fields
- All `product.description` fields

These are merged with the existing dictionary keys and shown in the translation list.

### Implementation Flow

1. **`app.openTranslationsModal()`** — if no unsaved translation changes, re-fetches from GitHub (aggressive sync). Renders modal.
2. **`app.renderTranslationsList()`** — syncs any live input edits first (`_syncTranslationInputs`), then regenerates the list HTML from `translationsData` + `getDynamicAppStrings()`
3. **`app._syncTranslationInputs()`** — reads all `.trans-key-input` / `.trans-val-input` DOM elements, rebuilds `translationsData`. Handles search-filtered partial view correctly.
4. **`app.addNewTranslation()`** — syncs inputs, adds a placeholder key `"New English Text {random}"` → `"New Hindi Translation"`, clears search, re-renders, scrolls to bottom.
5. **`app.deleteTranslation(key)`** — `confirm()` → syncs inputs → `delete translationsData[key]` → re-render
6. **`app.saveTranslations()`** — syncs inputs, sets `hasUnsavedChanges = true`, `hasUnsavedTranslations = true`, closes modal.

### Commit Integration

When `hasUnsavedTranslations` is true, the commit payload includes a `translations.js` tree entry:

```javascript
tree.push({
    path: 'translations.js',
    mode: '100644',
    type: 'blob',
    content: `const translations = ${JSON.stringify(this.translationsData, null, 4)};\n`
});
```

---

## 19. GitHub API Layer

### Two API Helpers

#### `app._ghFetch(path, options)` — GitHub Contents API

Used for file-level operations (GET file, list directory):

```javascript
async _ghFetch(path, options = {}) {
    const url = new URL(`https://api.github.com/repos/${user}/${repo}/contents/${path}`);
    if (options.bust) {
        url.searchParams.append('timestamp', Date.now());
        options.cache = 'no-store';
        delete options.bust;
    }
    options.headers = options.headers || {};
    options.headers['Authorization'] = `token ${this.auth.token}`;
    if (options.method && options.method !== 'GET') {
        options.headers['Content-Type'] = 'application/json';
    }
    return fetch(url.toString(), options);
}
```

| Usage | Options |
|---|---|
| Read a file | `{ bust: true }` |
| List a directory | `_ghFetch('assets/sarees')` |
| PUT (upload) | `{ method: 'PUT', body: JSON.stringify({...}) }` |

#### `app._ghAPI(endpoint, method, body)` — GitHub Git Data API

Used for commits (Git Tree workflow):

```javascript
async _ghAPI(endpoint, method = 'GET', body = null) {
    const url = `https://api.github.com/repos/${user}/${repo}/${endpoint}`;
    // Throws on non-OK with GitHub error message
}
```

| Usage | Endpoint |
|---|---|
| Get repo info | `''` |
| Get branch ref | `git/refs/heads/{branch}` |
| Get commit | `git/commits/{sha}` |
| Create tree | `git/trees` (POST) |
| Create commit | `git/commits` (POST) |
| Update branch | `git/refs/heads/{branch}` (PATCH) |

### Cache Busting

All read operations (including login fetch) append `?timestamp={Date.now()}` to prevent GitHub CDN from returning stale data. `cache: 'no-store'` is set on headers.

Without cache busting, the admin could read a stale `data.json` from the CDN edge and overwrite newer changes.

---

## 20. Data Schema Reference

### `data.json` Top-Level Structure

```json
{
  "site_config": { ... },
  "products": {
    "sarees": [ ...ProductObject ],
    "bedsheets": [ ...ProductObject ]
  }
}
```

### `site_config` Fields

| Key | Type | Description |
|---|---|---|
| `hero_cover` | `string` | Relative path to hero banner image |
| `hero_title` | `string` | Hero section headline |
| `hero_subtitle` | `string` | Hero section subheading |
| `sarees_cover` | `string` | Sarees page header banner |
| `sarees_title` | `string` | Sarees page header title |
| `sarees_subtitle` | `string` | Sarees page header subtitle |
| `bedsheets_cover` | `string` | Bedsheets page header banner |
| `bedsheets_title` | `string` | Bedsheets page header title |
| `bedsheets_subtitle` | `string` | Bedsheets page header subtitle |
| `home_sarees_cover` | `string` | Homepage collections section — saree card image |
| `home_sarees_title` | `string` | Homepage saree collection title |
| `home_sarees_subtitle` | `string` | Homepage saree collection description |
| `home_bedsheets_cover` | `string` | Homepage collections section — bedsheet card image |
| `home_bedsheets_title` | `string` | Homepage bedsheet collection title |
| `home_bedsheets_subtitle` | `string` | Homepage bedsheet collection description |
| `delivery_value` | `string` | `"Free Delivery"` or a numeric string like `"50"` |
| `whatsapp_number` | `string` | Full international format, e.g. `"919876543210"` |
| `about_title` | `string` | "About/Why Choose Us" section title |
| `about_subtitle` | `string` | About section subtitle |
| `about_f1_title` | `string` | Feature 1 title |
| `about_f1_desc` | `string` | Feature 1 description |
| `about_f2_title` | `string` | Feature 2 title |
| `about_f2_desc` | `string` | Feature 2 description |
| `about_f3_title` | `string` | Feature 3 title |
| `about_f3_desc` | `string` | Feature 3 description |

### Product Object Fields

```json
{
  "id": "p1712345678901",
  "name": "Banarasi Silk Saree",
  "price": "₹4500",
  "image": "assets/sarees/1712345678901_banarasi.webp",
  "more_images": ["assets/sarees/1712345678902_banarasi-2.webp"],
  "stock": 5,
  "discount": 15,
  "badge": "sale",
  "description": "Handwoven Banarasi silk...",
  "style": "",
  "status": "live",
  "dateAdded": "2025-04-08T10:00:00.000Z"
}
```

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | `'p' + Date.now()` — unique, used as URL hash and SEO page filename |
| `name` | `string` | Display name — also used as WhatsApp order text |
| `price` | `string` | Always stored with ₹ prefix: `"₹4500"` |
| `image` | `string` | Relative path from repo root. Never an absolute URL. |
| `more_images` | `string[]` | Array of relative paths. Can be empty `[]`. |
| `stock` | `number` | Integer. `<= 0` → "Out of Stock" UI. Archived products must have `stock = 0`. |
| `discount` | `number` | 0–100. `0` = no discount. Displayed as a badge and used to compute MRP. |
| `badge` | `string` | `""` / `"new"` / `"sale"` / `"trending"` |
| `description` | `string` | Product detail description — shown in detail modal |
| `style` | `string` | Optional inline CSS applied to the card image element (e.g. `"object-position: top"`) |
| `status` | `string` | `"live"` / `"hidden"` / `"archived"`. Missing field treated as `"live"` |
| `dateAdded` | `string` | ISO 8601 timestamp. Used for sort by newest/oldest. |

---

## 21. UX Patterns & UI Conventions

### Color System

| Token | Hex | Usage |
|---|---|---|
| Primary | `#7B1338` | Deep Maroon — headings, buttons, borders, accent |
| Accent | `#B08D57` | Warm Gold — highlights, decorative elements |
| Live Green | `#38a169` / `#276749` | Status indicators and tab |
| Hidden Amber | `#d69e2e` / `#975a16` | Status indicators and tab |
| Archived Red | `#e53e3e` / `#742a2a` | Status indicators and tab |
| Text Dark | `#2c2c2c` | Body text |
| Background | `#f9f5ef` | Warm off-white page background |

### Typography

- **Font:** `Outfit` (Google Fonts, weights 300–700)
- Loaded via: `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700">`

### Toast Notifications

All non-critical feedback uses a toast (`#toast`):

```javascript
showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
}
```

Auto-hides after 3 seconds. Used for: upload success, product added, product updated, commit success, etc.

### Modal Pattern

All modals are `position: fixed; top:0; left:0; width:100%; height:100%` overlays with:
- `background: rgba(0,0,0,0.82)` backdrop
- `backdrop-filter: blur(4px)`
- `z-index: 9999`
- Click on backdrop → close (`modal.onclick = () => modal.remove()`)
- `✕` button (top-right corner) → `modal.remove()`
- `Escape` key → removes `admin-edit-modal` and `admin-pref-modal`
- Commit confirm modal uses `z-index: 99999` (above other modals)

### Unsaved Changes Guard

```javascript
window.addEventListener('beforeunload', function (e) {
    if (app.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});
```

Every mutation calls `app.markChanged()` which sets `hasUnsavedChanges = true`. This flag is cleared on successful commit.

### Header Bar Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Parinay Saree Admin Dashboard    🌐 Live Site  🌍 Translations             │
│ Editing: username/repo           👁 Preview  🧹 Cleanup  📄 Export PDF     │
│                                  [ Commit Changes to GitHub ]              │
└────────────────────────────────────────────────────────────────────────────┘
```

Buttons are in a `flex-wrap: wrap; justify-content: flex-end` row.

---

## 22. State Management Reference

### Full App State Map

```
app.auth             → { username, repo, token }         set once on login
app.data             → { site_config, products }         full live in-memory DB
app.fileSha          → string                            SHA of data.json (for PUT)
app.originalDataText → JSON string                       snapshot at last commit (for diff)
app.hasUnsavedChanges→ boolean                           dirty flag
app.translationsData → { English: Hindi, ... }           in-memory translation dict
app.translationsFileSha → string                         SHA of translations.js
app.hasUnsavedTranslations → boolean                     dirty flag for translations
app.activeStatusTab  → 'all'|'live'|'hidden'|'archived'  current filter
app.currentPage      → number                            pagination cursor
app.pageSize         → 20                                constant
app.selectedIndices  → Set<number>                       real indices of selected rows
app.pendingDeletions → Set<string>                       image paths to delete on commit
```

### Mutation Flow

```
User action
   ↓
app.data mutated in memory
   ↓
app.markChanged() → hasUnsavedChanges = true
   ↓
app.renderProducts() → update list UI
app.updateMetrics()  → update KPI cards
   ↓
[Later] User clicks "Commit Changes"
   ↓
_confirmCommit() → show diff modal
   ↓
saveChanges() → Git Tree commit
   ↓
originalDataText updated, hasUnsavedChanges = false
```

---

## 23. Developer Rules & Constraints

These rules are **mandatory** for anyone implementing or extending the admin panel:

1. **Zero Dependencies** — Never introduce NPM, jQuery, Lodash, React, or any UI kit. All logic in vanilla JS.

2. **Never Hardcode Secrets** — GitHub PAT is entered at runtime only. Never embed in any file.

3. **Cache Bust All Reads** — Always use `?timestamp={Date.now()}` or `{ bust: true }` for any `data.json` GET. A fresh SHA is mandatory before any PUT.

4. **JSON Decode Safely** — Always use `decodeURIComponent(escape(window.atob(...)))` + slice from first `{` to last `}`. Never raw `JSON.parse` on GitHub API content.

5. **SHA Discipline** — Always read the latest `fileSha`/SHA before any PUT commit. Stale SHAs cause `409 Conflict`.

6. **Image Safety** — Never delete a GitHub image file without running `deleteFileFromGitHub()` which includes the 3-layer inUse check.

7. **Status Default** — When reading product status, always default to `'live'` if field is missing. Legacy products in `data.json` don't have a status field.

8. **Real Index Mapping** — When iterating a filtered product list in admin, always map back to real indices in `data.products[category]` before editing or deleting.

9. **Preview Cleanup** — After a successful commit, always clear `localStorage` keys `parinay_preview_data` and `parinay_preview_translations`.

10. **Archived Auto-Zero Stock** — When a product is set to `archived` status, always set `stock = 0` simultaneously.

11. **Deferred Commit Pattern** — Only `data.json` and `translations.js` are staged. Image files upload immediately to GitHub on selection. Never break this separation.

12. **Atomic Git Tree Commit** — All file changes in one commit must go through the Git Tree API (`/git/trees` + `/git/commits` + `/git/refs`). Never use individual `PUT` calls for multi-file commits.

---

*This document comprehensively covers all admin panel features as implemented in `admin.html` + `admin.js`. It should be treated as the authoritative guide for building a mobile app equivalent of this CMS.*
