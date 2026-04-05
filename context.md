# Project Context: Serverless GitHub Pages CMS

This document outlines the architecture and troubleshooting steps for the serverless content management system (CMS) driving the Aditi Textiles website.

## 1. Architecture Overview
The website operates 100% via static hosting (GitHub Pages) with no external database or backend server.
- **Data Layer:** All dynamic content (products, prices, category cover photos) is stored in a single `data.json` file.
- **Frontend Pages:** Static HTML files (`index.html`, `sarees.html`, `bedsheets.html`, etc.) execute client-side JavaScript on page load to fetch `data.json` and inject the data dynamically into the DOM.
- **Admin Dashboard:** `admin.html` serves as a serverless UI. It interfaces directly with the GitHub REST API (`https://api.github.com/repos/{owner}/{repo}/contents/data.json`) to update the JSON file in the live repository. Once modified, GitHub Pages automatically redeploys.

## 2. Authentication & Security
- The Admin UI requires a **GitHub Personal Access Token (PAT)**, **Username**, and **Repository Name**.
- The token securely authorizes `PUT` requests to commit `.json` changes directly to the `main` branch online.
- All JSON content is securely `Base64` encoded/decoded inside the browser via `admin.js`.

## 3. Troubleshooting Admin Commits
If a commit fails when attempting to save in the Admin Dashboard, the underlying API call failed. Key reasons include:

- **Missing Token Permissions:** 
  - *Classic PAT:* Must have the **`repo`** scope checked.
  - *Fine-Grained PAT:* Must have **`Contents`** repository permission set to **Read and Write**.
- **SHA Collision (409 Conflict):** GitHub requires the exact blob `sha` of `data.json` to overwrite it. If the file is modified elsewhere (e.g., via the GitHub UI, another branch, or a local push) without reloading the admin page, the fetched `sha` is invalid. *Fix: Refresh the admin page to fetch the latest `sha`.*
- **No Change Made:** If the Base64 content exactly matches the existing file, GitHub may reject the save.

## 4. UI/UX: CSS Transform vs. Position Fixed Bug
**The Issue:** Applying a CSS `transform` (e.g., `translateY`) during an animation creates a new containing block. If this animation is applied to the `body` or a parent element (like `<site-navbar>`), it breaks `position: fixed` for any descendant elements. 

Instead of staying fixed to the user's screen/viewport, elements (like the Navbar, Cart Modal, Checkout Modal, and WhatsApp floating button) degrade to `position: absolute` and stick to the center/top of the *document body*, scrolling away as the user moves down the page.

**The Solution:**
To maintain premium fade-in animations without breaking fixed elements:
1. **Exclude Fixed Parents:** Update the CSS animation selector to explicitly ignore elements that contain fixed items:
   ```css
   body > *:not(site-navbar):not(#cart-modal):not(#checkout-modal):not(#whatsapp-fab) {
       animation: parinayFadeIn 0.55s ease-out both;
   }
   ```
2. **Global Appending:** Ensure all dynamic floating elements (like the modals and WhatsApp FAB) are appended directly to the `body` as direct children, so they can be targeted and excluded by the `:not()` selector above.

## 5. UI/UX Enhancements & Optimization 
- **Mobile Navigation:** Added a responsive hamburger menu that effortlessly toggles a slide-down drawer for mobile links.
- **Pricing Standardization:** Enforced a universal "₹" prefix for visual consistency. Added validation in the admin panel to securely sanitize inputs, ensuring only numerical data updates data.json.
- **Inline Cart Controls:** Shifted products out of pure "Add to Cart" wrappers by integrating interactive [-] Qty [+] overlays. Operates dynamically depending on the current list of items securely stored in local storage, running silently without forcing the main cart modal open.
- **Admin Configuration Extensibility:** Added dynamic WhatsApp number routing into data.json to tie checkout configurations seamlessly back to the UI.
- **Asset Optimization:** Replaced the heavy, static navbar image layout (logo.png) with an isolated, perfectly cropped icon asset (ps-logo.png) to optimize data thresholds automatically on load.
