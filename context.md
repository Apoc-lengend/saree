# Parinay Saree Project Context & Architecture Guide

## 1. Project Overview
**Parinay Saree** is a high-performance, single-page-application (SPA) style e-commerce website specifically tailored for high-end Sarees and premium Bedsheets. It is engineered entirely as a **Serverless Static Application** intended to be hosted directly on GitHub Pages. There is no traditional backend (Node, Python, PHP), nor is there a heavy UI framework (React, Angular). The entire ecosystem operates on vanilla HTML, CSS, and JS.

## 2. Core Functional Architecture
- **Data Source of Truth:** A single file, `data.json`, serves as the site's database. It stores overarching configuration (like hero images, WhatsApp number, and delivery fees) and complex nested arrays containing all active products.
- **Dynamic Frontend Construction:** `components.js` leverages Web Components (e.g., `<site-navbar>`) and template literals to recursively generate UI dynamically across pages (`sarees.html`, `bedsheets.html`, `search.html`). 
- **WhatsApp Order Fulfillment:** The cart does not bridge to a traditional payment API (like Stripe/Razorpay). Instead, checkout creates an aesthetically formatted, computed manifest (handling subtotals, a 5% GST calculation, and adaptive delivery fee limits) and injects it directly into a WhatsApp redirect URI.

## 3. The Admin Panel & GitHub API Backend
The `admin.html` and `admin.js` files form a completely self-contained browser-operated CMS (Content Management System).
- **Serverless Updates:** The admin uses a GitHub Personal Access Token to authenticate. It performs `GET` and `PUT` requests against the GitHub REST API to modify `data.json` directly within the repository.
- **Sanitized Parsing Engine:** Due to native browser JSON parsing strictness over fetched Base64 text streams from GitHub, `admin.js` employs robust whitespace stripping (`\uFEFF`, zero-width spaces) strictly slicing strings from `{` to `}` to prevent crashes during login or commits.
- **Automated Image Compression & Uploads:** The Add Product system natively receives raw image files via file inputs. Heavy files over 99KB are gracefully swallowed by an HTML5 canvas down-scaler. They are iteratively compressed via progressive JPEG quality reduction and successfully `PUT` directly into the repository's `assets/sarees/` or `assets/bedsheets/` paths using the GitHub connection seamlessly. 

## 4. UI / UX Design Characteristics
- **Dynamic Bilingual Design / Branding:** Primary colors rely upon deep maroon (`var(--primary-color)`) and gold (`var(--accent-color)`) to express premium ethnic clothing traits. 
- **Responsive Cart Overhaul:** 
  - **Desktop:** Features an elegant, fully detailed sliding right-drawer cart revealing dynamic granular financial breakdowns.
  - **Mobile:** Retains a compact center-focused modal pop-up strictly preserving thumb accessibility layout optimizations.
- **Product Popovers:** Clicking directly on a product's main photo triggers an interactive detail modal, exposing an admin-curated detailed description paragraph, large scaled branding, integrated badge metadata ("Sale", "% Off"), and a horizontally swipeable native gallery if additional images were appended.

## 5. Recent Transformations & Current Trajectory
- **Category Purge:** "Plush Pillows" and "Luxury Blankets" modules were totally stripped out system-wide (HTML, language translation arrays, JSON schema, and styling logic elements) focusing scaling efforts solely on Sarees & Bedsheets.
- **Aesthetic Alignments:** Adjusted the `.grid` sizing system enforcing robust `max-width` configurations so items don't stretch indefinitely when array sets naturally run low. 
- **Typography Execution:** Extensively stylized M.R.P. pricing alignments (perfecting superscript `₹` symbols natively over CSS scaling rather than generic broken `<sup>` tags) bridging a pristine retail vibe directly into the Saree and Bedsheet product lists.

**[AI Director Note]**:  If engaging further on this project, adhere strictly to the "no Node/NPM dependencies" rule. Rely exclusively on sophisticated Vanilla Javascript features and ensure all persistent data modifications hook backward perfectly across the GitHub REST API mechanism. Handle `data.json` manipulation exceptionally cautiously avoiding structure breakage.
