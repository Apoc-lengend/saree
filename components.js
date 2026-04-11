// ─── PROGRESSIVE WEB APP (PWA) SETUP ──────────────────────────────────────
if ('serviceWorker' in navigator && window.location.protocol === 'https:' && !window.location.pathname.includes('admin.html')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn('PWA registration failed:', err));
    });
}

// ─── COMPONENTS DEFINITION ────────────────────────────────────────────────
class SiteNavbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <nav class="navbar" id="navbar">
                <a href="index.html" class="logo">
                    <img src="assets/ps-logo.png" alt="Parinay Saree Logo" onerror="this.style.display='none'" style="height:64px; object-fit:contain; border-radius:4px;">
                    <span class="logo-text">Parinay <span>Saree</span></span>
                </a>
                <button id="mobile-menu-btn" onclick="toggleMobileMenu()" style="display:none; background:none; border:none; cursor:pointer; color:var(--primary-color);">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <ul class="nav-links" id="nav-links">
                    <li><a href="index.html" onclick="toggleMobileMenu()">Home</a></li>
                    <li><a href="index.html#collections" onclick="toggleMobileMenu()">Collections</a></li>
                    <li><a href="index.html#about" onclick="toggleMobileMenu()">About Us</a></li>
                    <li><a href="index.html#contact" onclick="toggleMobileMenu()">Contact</a></li>
                </ul>
                <div class="nav-actions" style="margin-left: 2rem; display: flex; align-items: center; gap: 1.2rem;">
                    <button id="nav-order-now-btn" onclick="openCart()" style="display:none; padding: 0.4rem 1.2rem; cursor: pointer; border-radius: 30px; font-weight: 700; border: none; background: var(--primary-color); color: white; font-family: inherit; font-size: 0.95rem; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(123,19,56,0.3);">Order Now</button>
                    <div class="nav-search-wrap" style="position:relative; display:flex; align-items:center;">
                        <input id="nav-search-input" type="text" placeholder="Search products..." onkeydown="if(event.key==='Enter') redirectToSearch(this.value)" style="width:0; opacity:0; padding:0; border:none; outline:none; font-family:inherit; font-size:0.9rem; border-radius:30px; background:#fdf8f2; transition:all 0.35s ease; color:#4a3728;">
                        <a href="javascript:void(0)" onclick="toggleSearch()" style="text-decoration:none; color:var(--heading-color); display:flex; transition:opacity 0.3s ease; margin-left:4px;" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </a>
                    </div>
                    <a href="javascript:void(0)" onclick="openCart()" style="position: relative; text-decoration: none; color: var(--heading-color); display: flex; transition: opacity 0.3s ease;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <span id="cart-count" style="position: absolute; top: -8px; right: -12px; background: var(--primary-color); color: white; border-radius: 50%; min-width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; padding: 0 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">0</span>
                    </a>
                    <button class="lang-switcher-btn"
                        style="padding: 0.4rem 1.2rem; cursor: pointer; border-radius: 30px; font-weight: 600; border: 1.5px solid var(--primary-color); background: transparent; color: var(--primary-color); font-family: inherit; font-size: 0.95rem; transition: all 0.3s ease;"
                        onmouseover="this.style.background='var(--primary-color)'; this.style.color='white';"
                        onmouseout="this.style.background='transparent'; this.style.color='var(--primary-color)';"
                        onclick="toggleLanguage()">हिंदी / EN</button>
                </div>
            </nav>
        `;
    }
}

class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <footer id="contact" class="footer">
                <div class="footer-content">
                    <div class="footer-logo">Parinay Saree</div>
                    <p>Silk District, Textile City</p>
                    <p>Email: contact@parinaysaree.com | Phone: +91 98765 43210</p>
                </div>
                <p>&copy; 2026 Parinay Saree. All rights reserved. Crafted with love &amp; tradition.</p>
            </footer>
        `;

        if (!document.getElementById('parinay-fade-style')) {
            const style = document.createElement('style');
            style.id = 'parinay-fade-style';
            style.textContent = `
                @keyframes parinayFadeIn {
                    from { opacity: 0; transform: translateY(18px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                body > *:not(#cart-modal):not(#checkout-modal):not(#whatsapp-fab):not(site-navbar) {
                    animation: parinayFadeIn 0.55s ease-out both;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

customElements.define('site-navbar', SiteNavbar);
customElements.define('site-footer', SiteFooter);

window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(253, 248, 242, 0.98)';
            navbar.style.boxShadow = '0 4px 30px rgba(123, 19, 56, 0.1)';
        } else {
            navbar.style.background = 'rgba(253, 248, 242, 0.85)';
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.05)';
        }
    }
});

function toggleSearch() {
    const input = document.getElementById('nav-search-input');
    if (!input) return;
    const isOpen = input.style.opacity === '1';
    if (isOpen) {
        input.style.width = '0';
        input.style.opacity = '0';
        input.style.padding = '0';
    } else {
        input.style.width = '180px';
        input.style.opacity = '1';
        input.style.padding = '0.4rem 1rem';
        input.focus();
    }
}

function redirectToSearch(query) {
    if (query && query.trim()) {
        window.location.href = 'search.html?q=' + encodeURIComponent(query.trim());
    }
}

function toggleMobileMenu() {
    const nav = document.getElementById('nav-links');
    if (nav) nav.classList.toggle('active');
}

let cartItems = JSON.parse(localStorage.getItem('parinay_cart')) || [];

window.showFrontendAlert = function(msg, isSuccess = false) {
    let old = document.getElementById('frontend-alert-modal');
    if (old) old.remove();

    let m = document.createElement('div');
    m.id = 'frontend-alert-modal';
    m.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(45,26,16,0.6); display:flex; align-items:center; justify-content:center; z-index:99999; backdrop-filter:blur(3px);';
    m.onclick = function(e) { if(e.target === m) m.remove(); };
    m.innerHTML = `
        <div style="background:white; padding:30px; border-radius:12px; max-width:340px; width:90%; text-align:center; box-shadow:0 10px 40px rgba(0,0,0,0.3); transform:scale(1); transition:transform 0.3s; animation: parinayFadeIn 0.3s ease-out;" onclick="event.stopPropagation()">
            <div style="font-size:3rem; margin-bottom:15px;">${isSuccess ? '✅' : '⚠️'}</div>
            <h3 style="font-family:'Playfair Display', serif; color:var(--primary-color); margin-bottom:10px;">Notice</h3>
            <p style="color:#444; font-size:1rem; margin-bottom:25px; line-height:1.5; font-weight:500;">${msg}</p>
            <button onclick="document.getElementById('frontend-alert-modal').remove()" style="background:var(--primary-color); color:white; border:none; padding:10px 35px; border-radius:30px; font-weight:bold; font-size:1rem; cursor:pointer; box-shadow:0 4px 10px rgba(123,19,56,0.2);">OK</button>
        </div>
    `;
    document.body.appendChild(m);
};

window.getProductStock = function(name) {
    if(!window.siteData || !window.siteData.products) return 100;
    for (let category in window.siteData.products) {
        let p = window.siteData.products[category].find(p => p.name === name);
        if (p) return typeof p.stock !== 'undefined' ? p.stock : 10;
    }
    return 100;
};

function addToCart(name, priceStr, imageSrc) {
    let maxStock = window.getProductStock(name);
    let existing = cartItems.find(i => i.name === name);
    let currentQty = existing ? (existing.quantity || 1) : 0;
    
    if (currentQty >= maxStock) {
        window.showFrontendAlert('Maximum stock limit reached for this item.');
        return;
    }

    let priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    if (isNaN(priceNum)) priceNum = 0;
    
    if(existing) {
        existing.quantity = currentQty + 1;
    } else {
        cartItems.push({ name, price: priceNum, priceStr: '₹' + priceNum.toLocaleString('en-IN'), image: imageSrc || 'assets/saree.png', quantity: 1 });
    }
    localStorage.setItem('parinay_cart', JSON.stringify(cartItems));
    updateCartIcon();
}

window.getProductCardOverlayHTML = function(productName, priceStr, imageSrc) {
    let existing = cartItems.find(i => i.name === productName);
    let qty = existing ? existing.quantity : 0;
    let safeName = String(productName).replace(/'/g,"\\\\'");
    let priceSafe = String(priceStr).replace(/'/g,"\\\\'");
    let imgSafe = String(imageSrc).replace(/'/g,"\\\\'");

    if (qty > 0) {
        return `
            <div class="product-card-overlay active-state" style="transform:translateY(0); background:rgba(255,255,255,0.95); display:flex; justify-content:center; align-items:center;">
                <div style="display:flex; align-items:center; gap:16px;">
                    <button onclick="event.stopPropagation(); updateCartQtyByName('${safeName}', -1, true)" style="background:var(--primary-color); color:white; border:none; padding:4px 14px; font-weight:bold; font-size:1.2rem; border-radius:6px; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.2);">-</button>
                    <span style="font-weight:900; font-size:1.1rem; color:var(--heading-color); min-width:24px; text-align:center;">${qty}</span>
                    <button onclick="event.stopPropagation(); updateCartQtyByName('${safeName}', 1, true)" style="background:var(--primary-color); color:white; border:none; padding:4px 14px; font-weight:bold; font-size:1.2rem; border-radius:6px; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.2);">+</button>
                </div>
            </div>`;
    } else {
        return `
            <div class="product-card-overlay">
                <button onclick="event.stopPropagation(); addToCart('${safeName}', '${priceSafe}', '${imgSafe}')">Add to Cart</button>
            </div>`;
    }
};

window.getModalCartBtnHTML = function(productName, priceStr, imageSrc, stock) {
    let existing = cartItems.find(i => i.name === productName);
    let qty = existing ? existing.quantity : 0;
    let safeName = String(productName).replace(/'/g,"\\\\'");
    let priceSafe = String(priceStr).replace(/'/g,"\\\\'");
    let imgSafe = String(imageSrc).replace(/'/g,"\\\\'");

    if (stock <= 0) {
        return `<button class="checkout-btn" disabled style="width:100%; border:none; background:#ccc; color:white; padding:15px; border-radius:6px; font-size:1.15rem; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">Out of Stock</button>`;
    }

    if (qty > 0) {
        return `
            <div style="display:flex; justify-content:center; align-items:center; background:#f9f9f9; border-radius:8px; padding:15px; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:16px;">
                    <button onclick="event.stopPropagation(); updateCartQtyByName('${safeName}', -1, true)" style="background:var(--primary-color); color:white; border:none; padding:4px 14px; font-weight:bold; font-size:1.2rem; border-radius:6px; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.2);">-</button>
                    <span style="font-weight:900; font-size:1.1rem; color:var(--heading-color); min-width:24px; text-align:center;">${qty}</span>
                    <button onclick="event.stopPropagation(); updateCartQtyByName('${safeName}', 1, true)" style="background:var(--primary-color); color:white; border:none; padding:4px 14px; font-weight:bold; font-size:1.2rem; border-radius:6px; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.2);">+</button>
                </div>
            </div>
            <button onclick="openCart(); document.getElementById('product-details-modal').remove();" style="width:100%; border:none; background:var(--primary-color); color:white; padding:12px; border-radius:6px; font-size:0.9rem; font-weight:bold; cursor:pointer; text-transform:uppercase; letter-spacing:1px; box-shadow:0 4px 15px rgba(123,19,56,0.3);">Go to Checkout ➜</button>`;
    } else {
        return `<button class="checkout-btn" onclick="addToCart('${safeName}', '${priceSafe}', '${imgSafe}')" style="width:100%; border:none; background:var(--primary-color); color:white; padding:15px; border-radius:6px; font-size:1.15rem; font-weight:bold; cursor:pointer; text-transform:uppercase; letter-spacing:1px; box-shadow:0 4px 15px rgba(123,19,56,0.3);">Add to Cart</button>`;
    }
};

window.updateCartQtyByName = function(name, change, silent = false) {
    let index = cartItems.findIndex(i => i.name === name);
    if (index !== -1) {
        updateCartQty(index, change, silent);
    }
};

function updateCartIcon() {
    let countEl = document.getElementById('cart-count');
    let orderNowBtn = document.getElementById('nav-order-now-btn');
    let totalCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (countEl) countEl.innerText = totalCount;
    
    if (orderNowBtn) {
        orderNowBtn.style.display = totalCount > 0 ? 'block' : 'none';
    }
    
    document.querySelectorAll('.overlay-container').forEach(container => {
        let n = container.getAttribute('data-product-name');
        let p = container.getAttribute('data-price');
        let i = container.getAttribute('data-img');
        container.innerHTML = window.getProductCardOverlayHTML(n, p, i);
    });

    document.querySelectorAll('.modal-cart-container').forEach(container => {
        let n = container.getAttribute('data-product-name');
        let p = container.getAttribute('data-price');
        let i = container.getAttribute('data-img');
        let s = parseInt(container.getAttribute('data-stock')) || 0;
        container.innerHTML = window.getModalCartBtnHTML(n, p, i, s);
    });
}

// ─── CENTRALIZED HELPERS ──────────────────────────────────────────────────

// Brand logo paths — single source of truth, used by buildProductCard & showProductDetails
const PS_LOGO      = 'assets/ps-logo-compressed.png';
const SKYLOOM_LOGO = 'assets/skyloom-logo.png';

// Compute delivery cost from site config. Returns { cost: number, text: string }
function getDeliveryCost() {
    const dv = (window.siteConfigData && window.siteConfigData.delivery_value) ? window.siteConfigData.delivery_value : '';
    const num = parseFloat(dv);
    if (!isNaN(num) && num > 0) return { cost: num, text: '₹' + num.toLocaleString('en-IN') };
    return { cost: 0, text: dv || 'Free Delivery' };
}

window.siteConfigData = null;
window.siteData = null; // Full data object — shared so product pages avoid a second fetch

// Skip this fetch entirely on the admin page — admin manages its own authenticated fetch
if (!window.location.pathname.includes('admin')) {
    fetch('data.json?v=' + new Date().getTime(), {cache: 'no-store'})
        .then(r => r.json())
        .then(d => {
            window.siteConfigData = d.site_config;
            window.siteData = d;
            let fab = document.getElementById('whatsapp-fab');
            if (fab) fab.href = `https://wa.me/${d.site_config.whatsapp_number || '919876543210'}`;
            // Fire event so any page script waiting on this data can proceed
            window.dispatchEvent(new Event('siteDataReady'));
        }).catch(e => {});
}

window.injectPageSchema = function(products) {
    let oldSchema = document.getElementById('seo-schema');
    if (oldSchema) oldSchema.remove();

    let schemaData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": products.map((p, index) => {
            const priceNum = parseFloat(String(p.price).replace(/[^0-9.]/g, '')) || 0;
            return {
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "Product",
                    "name": p.name,
                    "image": window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/') + '/' + p.image,
                    "description": p.description || p.name,
                    "sku": p.id || p.name.split(' ').join('-').toLowerCase(),
                    "offers": {
                        "@type": "Offer",
                        "priceCurrency": "INR",
                        "price": priceNum,
                        "itemCondition": p.stock > 0 ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
                        "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                        "url": window.location.href
                    }
                }
            };
        })
    };

    const script = document.createElement('script');
    script.id = 'seo-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
};

window.generatePriceHTML = function(priceString, discount, isModal = false) {
    const priceNum = parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
    const fw = isModal ? '700' : '600';
    const sz = isModal ? '1.45rem' : '1.10rem';
    const minH = isModal ? 'auto' : '44px';
    if (discount > 0) {
        const msrp = Math.round(priceNum / (1 - discount / 100));
        return `<div style="display:flex; flex-direction:column; align-items:flex-start; justify-content:flex-start; min-height:${minH}; line-height:1.2;">
                    <span class="selling-price" style="font-size:${sz}; color:var(--primary-color); font-weight:${fw}; display:flex; align-items:flex-start;">
                        <span style="font-size:0.55em; margin-top:0.3em; margin-right:0.1em; font-weight:400;">₹</span><span>${priceNum.toLocaleString('en-IN')}</span>
                    </span>
                    <span class="original-price" style="font-size:0.8rem; color:#565959; font-weight:normal; text-decoration:none; margin-top:2px;">
                        M.R.P.: <span style="text-decoration:line-through;">₹${msrp.toLocaleString('en-IN')}</span>
                    </span>
                </div>`;
    }
    return `<div style="display:flex; flex-direction:column; align-items:flex-start; justify-content:flex-start; min-height:${minH}; line-height:1.2;">
                <span class="selling-price" style="font-size:${sz}; color:var(--primary-color); font-weight:${fw}; display:flex; align-items:flex-start;">
                    <span style="font-size:0.55em; margin-top:0.3em; margin-right:0.1em; font-weight:400;">₹</span><span>${priceNum.toLocaleString('en-IN')}</span>
                </span>
            </div>`;
};

window.buildProductCard = function(product, category = '') {
    const isSaree = category === 'sarees' || window.location.pathname.includes('sarees.html') || product.category === 'sarees';
    const discount = product.discount || 0;
    const stock = product.stock !== undefined ? product.stock : 10;
    const isOutOfStock = stock <= 0;
    const badge = product.badge || '';
    
    let priceHTML = window.generatePriceHTML(product.price, discount, false);
    const leftBadge = discount > 0 ? `<div class="product-badge-wrap"><span class="badge-discount">${discount}% Off</span></div>` : '';
    const labelMap = { new: 'label-new', sale: 'label-sale', trending: 'label-trending' };
    const rightBadge = badge && labelMap[badge] ? `<span class="product-label-badge ${labelMap[badge]}">${badge}</span>` : '';
    const overlayWrapper = isOutOfStock ? '' : `
        <div class="overlay-container" data-product-name="${product.name.replace(/"/g, '&quot;')}" data-price="${product.price.replace(/"/g, '&quot;')}" data-img="${product.image.replace(/"/g, '&quot;')}">
            ${window.getProductCardOverlayHTML(product.name, product.price, product.image)}
        </div>`;
    const logoHTML = isSaree
        ? `<img src="${PS_LOGO}" style="height:48px; margin-left:auto; object-fit:contain;" alt="Parinay Saree brand logo">`
        : `<img src="${SKYLOOM_LOGO}" style="height:65px; margin-left:auto; object-fit:contain;" alt="Skyloom brand logo">`;
    const card = document.createElement('div');
    card.className = 'product-card' + (isOutOfStock ? ' out-of-stock' : '');
    card.innerHTML = `<div class="product-card-img" style="cursor:pointer;"><img src="${product.image}" loading="lazy" alt="${product.name}" style="${product.style || ''}">${leftBadge}${rightBadge}${overlayWrapper}</div><div class="product-card-info"><h3 title="${product.name}">${product.name}</h3><div class="price-row">${priceHTML}${logoHTML}</div></div>`;
    
    card.querySelector('.product-card-img').addEventListener('click', function(e) {
        if(e.target.closest('button')) return;
        window.showProductDetails(product, isSaree);
    });
    
    return card;
};

window.copyProductLink = function(id, btnElement) {
    let basePath = window.location.pathname;
    if (basePath.endsWith('.html')) {
        basePath = basePath.substring(0, basePath.lastIndexOf('/'));
    } else if (basePath.endsWith('/')) {
        basePath = basePath.substring(0, basePath.length - 1);
    }
    const url = window.location.origin + basePath + '/p/' + id + '.html';
    
    const showSuccess = () => {
        if (btnElement) {
            const originalText = btnElement.innerHTML;
            btnElement.innerHTML = '&#10003; Copied!';
            btnElement.style.background = '#d1fae5';
            btnElement.style.color = '#065f46';
            setTimeout(() => {
                btnElement.innerHTML = originalText;
                btnElement.style.background = '#f3f4f6';
                btnElement.style.color = '#374151';
            }, 2000);
        }
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(showSuccess).catch(() => fallbackCopy(url));
    } else {
        fallbackCopy(url);
    }
    
    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
            document.execCommand('copy');
            showSuccess();
        } catch(e) { }
        document.body.removeChild(ta);
    }
};

window.showProductDetails = function(product, isSaree) {
    if (history.pushState && product.id) history.pushState(null, null, '#' + product.id);
    let allImages = [product.image];
    if (product.more_images && product.more_images.length > 0) {
        allImages = allImages.concat(product.more_images.filter(x=>x));
    }
    
    let _copyBtn = `<button onclick="window.copyProductLink('${product.id}', this)" style="background:#f3f4f6; border:1px solid #d1d5db; border-radius:30px; padding:4px 10px; font-size:0.75rem; cursor:pointer; font-weight:600; color:#374151; display:flex; align-items:center; transition:background 0.2s; margin-left:auto;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">&#128279; Copy Link</button>`;

    let imagesHTML = '';
    if (allImages.length === 1) {
        imagesHTML = `
        <img src="${allImages[0]}" loading="lazy" style="width:100%; max-height:400px; border-radius:8px; object-fit:contain; margin-bottom:5px; background:#fcfcfc;">
        <div style="display:flex; margin-bottom:15px;">${_copyBtn}</div>
        `;
    } else {
        const slides = allImages.map((img, i) => `
            <div style="width:100%; max-height:400px; flex-shrink:0; scroll-snap-align:center; display:flex; align-items:center; justify-content:center; background:#fcfcfc; border-radius:8px;">
                <img src="${img}" loading="lazy" style="width:100%; height:100%; max-height:400px; object-fit:contain; border-radius:8px;">
            </div>
        `).join('');
        
        const dots = allImages.map((_, i) => `<div class="carousel-dot" style="width:8px; height:8px; border-radius:50%; background:${i===0?'var(--primary-color)':'#ccc'}; cursor:pointer; transition:0.2s;" onclick="const t=document.getElementById('product-carousel-track'); t.scrollTo({left:${i}*t.clientWidth, behavior:'smooth'})"></div>`).join('');

        imagesHTML = `
        <div style="position:relative; width:100%; margin-bottom:5px; border-radius:8px; overflow:hidden;">
            <button tabindex="0" aria-label="Previous image"
                onclick="const t=document.getElementById('product-carousel-track'); if(Math.round(t.scrollLeft)<=0){t.scrollTo({left:t.scrollWidth, behavior:'smooth'})}else{t.scrollBy({left:-t.clientWidth, behavior:'smooth'})}"
                style="position:absolute; top:50%; left:10px; transform:translateY(-50%); background:rgba(255,255,255,0.9); border:2px solid transparent; width:36px; height:36px; border-radius:50%; font-size:1.2rem; cursor:pointer; color:#333; z-index:2; box-shadow:0 2px 5px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; transition:background 0.2s, border-color 0.2s;"
                onmouseover="this.style.background='white'" onmouseout="this.style.background='rgba(255,255,255,0.9)'"
                onfocus="this.style.borderColor='var(--primary-color)'; this.style.outline='none';"
                onblur="this.style.borderColor='transparent'">&#10094;</button>
            
            <div id="product-carousel-track" style="display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; -ms-overflow-style:none; scroll-behavior:smooth;" onscroll="
                const index = Math.round(this.scrollLeft / this.clientWidth);
                const dots = document.getElementById('product-carousel-dots').children;
                for(let i=0; i<dots.length; i++) {
                    dots[i].style.background = (i === index) ? 'var(--primary-color)' : '#ccc';
                }
            ">
                <style>#product-carousel-track::-webkit-scrollbar { display:none; }</style>
                ${slides}
            </div>
            
            <button tabindex="0" aria-label="Next image"
                onclick="const t=document.getElementById('product-carousel-track'); if(Math.round(t.scrollLeft)>=Math.round(t.scrollWidth-t.clientWidth)){t.scrollTo({left:0, behavior:'smooth'})}else{t.scrollBy({left:t.clientWidth, behavior:'smooth'})}"
                style="position:absolute; top:50%; right:10px; transform:translateY(-50%); background:rgba(255,255,255,0.9); border:2px solid transparent; width:36px; height:36px; border-radius:50%; font-size:1.2rem; cursor:pointer; color:#333; z-index:2; box-shadow:0 2px 5px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; transition:background 0.2s, border-color 0.2s;"
                onmouseover="this.style.background='white'" onmouseout="this.style.background='rgba(255,255,255,0.9)'"
                onfocus="this.style.borderColor='var(--primary-color)'; this.style.outline='none';"
                onblur="this.style.borderColor='transparent'">&#10095;</button>
        </div>
        <div style="position:relative; display:flex; justify-content:center; align-items:center; margin-bottom:15px; min-height:30px;">
            <div id="product-carousel-dots" style="display:flex; justify-content:center; gap:8px;">${dots}</div>
            <div style="position:absolute; right:0;">
                ${_copyBtn}
            </div>
        </div>
        `;
    }

    const discount = product.discount || 0;
    const badge = product.badge || '';
    const labelMap = { new: 'label-new', sale: 'label-sale', trending: 'label-trending' };
    const rightBadge = badge && labelMap[badge] ? `<span class="product-label-badge ${labelMap[badge]}" style="position:relative; display:inline-block; border-radius:4px; padding:3px 8px; margin-bottom:10px;">${badge}</span>` : '';
    const leftBadge = discount > 0 ? `<span class="badge-discount" style="position:relative; display:inline-block; border-radius:4px; padding:3px 8px; margin-bottom:10px; margin-right:10px;">${discount}% Off</span>` : '';

    let priceHTML = window.generatePriceHTML(product.price, discount, true);
    const logoHTML = isSaree
        ? `<img src="${PS_LOGO}" style="height:54px; margin-left:auto; object-fit:contain;" alt="Parinay Saree brand logo">`
        : `<img src="${SKYLOOM_LOGO}" style="height:80px; margin-left:auto; object-fit:contain;" alt="Skyloom brand logo">`;

    const modalHTML = `
        <div id="product-details-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:3000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(5px);" onclick="this.remove(); if(history.pushState) history.pushState(null, null, window.location.pathname);">
            <style>
                #product-details-inner::-webkit-scrollbar { width: 6px; }
                #product-details-inner::-webkit-scrollbar-track { background: transparent; }
                #product-details-inner::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 10px; }
                #product-details-inner::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.4); }
            </style>
            <div id="product-details-inner" style="background:white; width:90%; max-width:500px; max-height:90vh; overflow-y:auto; border-radius:12px; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.3); position:relative; scrollbar-width:thin; scrollbar-color:rgba(0,0,0,0.2) transparent;" onclick="event.stopPropagation()">
                <button onclick="document.getElementById('product-details-modal').remove(); if(history.pushState) history.pushState(null, null, window.location.pathname);" style="position:absolute; top:10px; right:15px; background:white; border:none; font-size:1.5rem; cursor:pointer; color:#333; z-index:10; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.1);">&times;</button>
                
                ${imagesHTML}
                
                <div style="padding:10px 0;">
                    <div style="display:flex; align-items:center;">
                        ${leftBadge} ${rightBadge}
                    </div>
                    <h2 style="font-family:'Playfair Display', serif; color:var(--primary-color); margin-bottom:10px; font-size:1.4rem;">${product.name}</h2>
                    
                    <div style="background:#fdf8f2; padding:15px; border-radius:8px; border-left:4px solid var(--accent-color); margin-bottom:15px;">
                        <p style="color:#555; font-size:0.95rem; line-height:1.5; white-space:pre-wrap;">${product.description || 'Premium quality fabric crafted with perfection and care. Beautifully woven patterns exuding elegance and tradition.'}</p>
                    </div>
                    
                    <div class="price-row" style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:20px;">
                        ${priceHTML}
                        ${logoHTML}
                    </div>
                    
                    <div class="modal-cart-container" data-product-name="${product.name.replace(/"/g, '&quot;')}" data-price="${product.price}" data-img="${product.image}" data-stock="${product.stock}">
                        ${window.getModalCartBtnHTML(product.name, product.price, product.image, product.stock)}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

};

function openCart() {
    let modal = document.getElementById('cart-modal');
    if (!modal) return;
    let listEl = document.getElementById('cart-items-list');
    listEl.innerHTML = '';
    let subtotal = 0;
    cartItems.forEach((item, index) => {
        let qty = item.quantity || 1;
        subtotal += item.price * qty;
        listEl.innerHTML += `
            <div class="cart-item-wrapper" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; border-bottom:1px solid #eee; padding-bottom:16px;">
                <div style="display:flex; align-items:flex-start; gap:12px;">
                    <img src="${item.image}" style="width:70px; height:70px; border-radius:4px; object-fit:cover; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                    <div style="padding-top:2px;">
                        <div style="font-weight:600; font-size:0.9rem; line-height:1.2; margin-bottom:6px; color:#111;">${item.name}</div>
                        <div class="d-hide-m" style="font-size:0.8rem; color:#666; margin-bottom:10px;">Rs. ${item.price.toLocaleString('en-IN')}.00</div>
                        <div style="display:flex; align-items:center; gap:0;">
                            <div style="border:1px solid #ccc; border-radius:2px; display:flex; align-items:center;">
                                <button onclick="updateCartQty(${index}, -1)" style="padding:4px 10px; cursor:pointer; border:none; background:transparent; font-size:1.1rem; color:#555;">-</button>
                                <span style="font-weight:600; font-size:0.85rem; padding:0 8px; min-width:24px; text-align:center;">${qty}</span>
                                <button onclick="updateCartQty(${index}, 1)" style="padding:4px 10px; cursor:pointer; border:none; background:transparent; font-size:1.1rem; color:#555;">+</button>
                            </div>
                            <button class="m-hide-d" onclick="removeFromCart(${index})" style="background:#ef4444; color:white; border:none; padding:3px 7px; cursor:pointer; margin-left:8px; border-radius:4px; font-weight:bold; font-size:0.8rem;">X</button>
                            <button class="d-hide-m" onclick="removeFromCart(${index})" style="background:transparent; color:#888; border:none; padding:4px 8px; cursor:pointer; margin-left:12px; font-size:1.1rem;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div class="m-hide-d" style="color:var(--primary-color); font-weight:bold; white-space:nowrap;">₹${(item.price * qty).toLocaleString('en-IN')}</div>
                    <div class="d-hide-m" style="color:#111; font-weight:600; font-size:0.95rem; white-space:nowrap;">Rs. ${(item.price * qty).toLocaleString('en-IN')}.00</div>
                </div>
            </div>`;
    });

    const { cost: deliveryCost, text: deliveryText } = getDeliveryCost();

    let gst = subtotal * 0.05;
    let total = subtotal + gst + deliveryCost;
    document.getElementById('cart-subtotal').innerText = '₹' + subtotal.toLocaleString('en-IN');
    document.getElementById('cart-gst').innerText = '₹' + gst.toLocaleString('en-IN');
    document.getElementById('cart-delivery').innerText = deliveryText;
    document.getElementById('cart-total').innerText = '₹' + total.toLocaleString('en-IN');
    let dCartTotal = document.getElementById('d-cart-total');
    if (dCartTotal) {
        dCartTotal.innerText = 'Rs. ' + total.toLocaleString('en-IN') + '.00';
        document.getElementById('d-cart-subtotal').innerText = 'Rs. ' + subtotal.toLocaleString('en-IN') + '.00';
        document.getElementById('d-cart-gst').innerText = 'Rs. ' + gst.toLocaleString('en-IN') + '.00';
        let dDel = document.getElementById('d-cart-delivery');
        if (deliveryCost === 0) dDel.innerText = 'Free Delivery';
        else dDel.innerText = 'Rs. ' + deliveryCost.toLocaleString('en-IN') + '.00';
    }
    modal.style.display = 'flex';
}

function updateCartQty(index, change, silent = false) {
    let item = cartItems[index];
    if (!item.quantity) item.quantity = 1;
    
    if (change > 0) {
        let maxStock = window.getProductStock(item.name);
        if (item.quantity + change > maxStock) {
            window.showFrontendAlert('Maximum stock limit reached for this item.');
            return;
        }
    }

    item.quantity += change;
    if (item.quantity <= 0) {
        cartItems.splice(index, 1);
    }
    localStorage.setItem('parinay_cart', JSON.stringify(cartItems));
    updateCartIcon();
    
    let modal = document.getElementById('cart-modal');
    if (modal && modal.style.display === 'flex') {
        openCart();
    } else if (!silent) {
        openCart();
    }
}

function removeFromCart(index) {
    cartItems.splice(index, 1);
    localStorage.setItem('parinay_cart', JSON.stringify(cartItems));
    updateCartIcon();
    openCart();
}

function closeCart() {
    document.getElementById('cart-modal').style.display = 'none';
}

function openCheckout() {
    if (cartItems.length === 0) { alert("Your cart is empty!"); return; }
    document.getElementById('cart-modal').style.display = 'none';
    document.getElementById('checkout-modal').style.display = 'flex';
}

function closeCheckout() {
    document.getElementById('checkout-modal').style.display = 'none';
}

function confirmOrder() {
    let name = document.getElementById('checkout-name').value;
    let phone = document.getElementById('checkout-phone').value;
    let address = document.getElementById('checkout-address').value;
    if (!name || !phone || !address) { alert("Please enter Name, Mobile No. and Delivery Address to proceed."); return; }
    let orderText = `*Hello Parinay Saree!* I would like to place an order.%0A%0A*Name:* ${name}%0A*Phone:* ${phone}%0A*Delivery Address:* ${address}%0A%0A*Order Details:*%0A`;
    let subtotal = 0;
    cartItems.forEach(item => {
        let qty = item.quantity || 1;
        subtotal += item.price * qty;
        orderText += `- ${item.name} x${qty} (₹${(item.price * qty).toLocaleString('en-IN')})%0A`;
    });

    const { cost: deliveryCost, text: deliveryText } = getDeliveryCost();

    let gst = subtotal * 0.05;
    let total = subtotal + gst + deliveryCost;
    orderText += `%0A*Subtotal:* ₹${subtotal.toLocaleString('en-IN')}%0A*GST (5%):* ₹${gst.toLocaleString('en-IN')}%0A*Delivery:* ${deliveryText}%0A*Total:* ₹${total.toLocaleString('en-IN')}%0A`;
    localStorage.removeItem('parinay_cart');
    cartItems = [];
    updateCartIcon();
    closeCheckout();
    let whatsappNum = (window.siteConfigData && window.siteConfigData.whatsapp_number) ? window.siteConfigData.whatsapp_number : '919876543210';
    let whatsappUrl = `https://wa.me/${whatsappNum}?text=${orderText}`;
    window.open(whatsappUrl, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartIcon();
    const modalsHTML = `
        <style>
            .m-hide-d { display: inline-flex; }
            .d-hide-m { display: none; }
            .cart-backdrop {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(45,26,16,0.6); z-index: 2000;
                backdrop-filter: blur(4px);
                display: none; align-items: center; justify-content: center;
            }
            .cart-container {
                background: white; border-radius: 12px;
                max-width: 500px; width: 90%; color: #333;
                box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                padding: 2rem;
                display: flex; flex-direction: column;
                max-height: 90vh;
            }
            .cart-header-title {
                margin-bottom: 1rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem;
                color: var(--primary-color); font-family: 'Playfair Display', serif; font-size: 1.5rem;
                display: flex; justify-content: space-between; align-items: center;
            }
            .cart-items-wrapper-d { max-height: 300px; overflow-y: auto; margin-bottom: 1.5rem; padding-right: 5px; }
            .cart-buttons-wrapper { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
            .keep-shopping-btn { background: #f9fafb; color:#333; border: 1px solid #ccc; }
            .checkout-btn { background: var(--primary-color); color: white; border: none; box-shadow: 0 4px 10px rgba(123,19,56,0.3); }

            @media (min-width: 769px) {
                .m-hide-d { display: none !important; }
                .d-hide-m { display: flex !important; }
                .cart-backdrop { justify-content: flex-end; align-items: flex-start; }
                .cart-container {
                    width: 440px; max-width: 440px; height: 100vh; max-height: 100vh;
                    border-radius: 0; padding: 2rem; margin: 0;
                    box-shadow: -10px 0 40px rgba(0,0,0,0.1);
                    animation: slideInRight 0.3s forwards;
                }
                .cart-header-title {
                    color: #111; font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 700;
                    border-bottom: none; margin-bottom: 0.5rem; padding-bottom: 0;
                }
                .cart-items-wrapper-d { flex: 1; margin-bottom: 1rem; max-height: none; }
                .cart-footer-container-d { padding-top: 1.5rem; margin-top: auto; }
                .cart-buttons-wrapper { flex-direction: column; gap: 0; margin-top: 1rem; }
                .checkout-btn { width: 100%; background: #2f0854; padding: 1rem; border-radius: 2px; font-size: 1rem; display: flex; justify-content: center; box-shadow: none; font-weight: 700; text-transform: none; }
                .checkout-btn:hover { background: #160429; }
            }
            @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        </style>
        <div id="cart-modal" class="cart-backdrop">
            <div class="cart-container">
                <div class="cart-header-title">
                    <span class="m-hide-d">Your Order Cart</span>
                    <span class="d-hide-m" style="font-size:1.4rem;">Your cart</span>
                    <button class="d-hide-m" onclick="closeCart()" style="background:transparent; border:none; font-size:1.6rem; cursor:pointer; color:#777; font-weight:300;">&times;</button>
                </div>
                <div class="d-hide-m" style="justify-content:space-between; font-size:0.75rem; color:#888; font-weight:600; letter-spacing:1px; margin-bottom:1rem; border-bottom:1px solid #eee; padding-bottom:0.8rem;">
                    <span>PRODUCT</span>
                    <span>TOTAL</span>
                </div>
                <div id="cart-items-list" class="cart-items-wrapper-d"></div>
                
                <div class="cart-footer-container-d">
                    <div class="m-hide-d" style="flex-direction:column; width:100%;">
                        <p style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-weight:500;"><span>Subtotal:</span> <span id="cart-subtotal">₹0</span></p>
                        <p style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:#6b7280; font-weight:500;"><span>GST (5%):</span> <span id="cart-gst">₹0</span></p>
                        <p style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:#6b7280; font-weight:500;"><span>Delivery:</span> <span id="cart-delivery" style="color:#25D366; font-weight:700;">Free Delivery</span></p>
                        <h3 style="display:flex; justify-content:space-between; margin-top:0.8rem; color:var(--primary-color); font-size:1.4rem;"><span>Total:</span> <span id="cart-total">₹0</span></h3>
                    </div>
                    
                    <div class="d-hide-m" style="flex-direction:column; width:100%;">
                       <div style="display:flex; justify-content:space-between; margin-bottom:0.6rem; font-size:0.95rem; color:#444;">
                           <span>Subtotal:</span> <span id="d-cart-subtotal">Rs. 0.00</span>
                       </div>
                       <div style="display:flex; justify-content:space-between; margin-bottom:0.6rem; font-size:0.95rem; color:#444;">
                           <span>GST (5%):</span> <span id="d-cart-gst">Rs. 0.00</span>
                       </div>
                       <div style="display:flex; justify-content:space-between; margin-bottom:1rem; font-size:0.95rem; color:#444; border-bottom:1px solid #eee; padding-bottom:1rem;">
                           <span>Delivery:</span> <span id="d-cart-delivery" style="color:#25D366; font-weight:600;">Free Delivery</span>
                       </div>

                       <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; font-size:1.1rem; color:#111; font-weight:700;">
                           <span>Estimated total</span> <span id="d-cart-total">Rs. 0.00</span>
                       </div>
                       <p style="font-size:0.85rem; color:#666;">Taxes, discounts and <span style="text-decoration:underline;">shipping</span> calculated at checkout.</p>
                    </div>

                    <div class="cart-buttons-wrapper">
                        <button class="m-hide-d keep-shopping-btn" onclick="closeCart()" style="padding: 0.8rem 1.5rem; border-radius:6px; cursor:pointer; font-family:inherit; font-weight:600;">Keep Shopping</button>
                        <button class="checkout-btn" onclick="openCheckout()" style="padding: 0.8rem 1.5rem; cursor:pointer; font-family:inherit; font-weight:bold; border-radius:4px;">Check out</button>
                    </div>
                </div>
            </div>
        </div>
        <div id="checkout-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(45,26,16,0.6); z-index:2000; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
            <div style="background:white; padding: 2.5rem; border-radius: 12px; max-width: 440px; width: 90%; color: #333; box-shadow: 0 20px 40px rgba(0,0,0,0.2); max-height:90vh; overflow-y:auto;">
                <h2 style="margin-bottom: 1.5rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; color:var(--primary-color); font-family:'Playfair Display', serif;">Confirm Details</h2>
                <div style="margin-bottom: 1.2rem;">
                    <label style="display:block; margin-bottom:0.5rem; font-weight:600; color:#374151;">Full Name</label>
                    <input type="text" id="checkout-name" placeholder="E.g. Aditi Sharma" style="width:100%; padding:0.8rem; border:1px solid #d1d5db; border-radius:6px; outline:none; font-family:inherit;">
                </div>
                <div style="margin-bottom: 1.2rem;">
                    <label style="display:block; margin-bottom:0.5rem; font-weight:600; color:#374151;">Mobile No.</label>
                    <input type="tel" id="checkout-phone" placeholder="+91 XXXXX XXXXX" style="width:100%; padding:0.8rem; border:1px solid #d1d5db; border-radius:6px; outline:none; font-family:inherit;">
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display:block; margin-bottom:0.5rem; font-weight:600; color:#374151;">Delivery Address</label>
                    <textarea id="checkout-address" placeholder="House No, Street Name, City, Pincode" style="width:100%; padding:0.8rem; border:1px solid #d1d5db; border-radius:6px; outline:none; font-family:inherit; resize:vertical; min-height:80px;"></textarea>
                </div>
                <p style="margin-bottom: 1.5rem; padding: 0.8rem 1rem; background: #fdf8f2; color: var(--primary-color); font-size: 0.95rem; border-radius: 6px; border: 1px solid var(--accent-color); line-height:1.4;">
                    <strong>Note:</strong> Call <strong>+91 98765 43210</strong> to confirm payment and complete your luxury order.
                </p>
                <div style="display:flex; justify-content:space-between; gap: 1rem;">
                    <button onclick="closeCheckout()" style="padding: 0.8rem 1.5rem; border:1px solid #ccc; background:#f9fafb; cursor:pointer; border-radius:6px; font-weight:600; width:100%; font-family:inherit;">Cancel</button>
                    <button onclick="confirmOrder()" style="padding: 0.8rem 1.5rem; background:#25D366; color:white; border:none; cursor:pointer; border-radius:6px; font-weight:bold; box-shadow:0 4px 10px rgba(37,211,102,0.3); width:100%; font-family:inherit;">Order on WhatsApp</button>
                </div>
            </div>
        </div>
        <!-- WhatsApp Floating Button appended globally -->
        <a id="whatsapp-fab" href="https://wa.me/919876543210" target="_blank" rel="noopener"
           title="Chat with us on WhatsApp"
           style="
               position: fixed;
               bottom: 28px;
               right: 28px;
               width: 60px;
               height: 60px;
               background: #25D366;
               border-radius: 50%;
               display: flex;
               align-items: center;
               justify-content: center;
               box-shadow: 0 6px 20px rgba(37,211,102,0.45);
               z-index: 9999;
               text-decoration: none;
               transition: transform 0.3s ease, box-shadow 0.3s ease;
               opacity: 0;
               animation: fabFadeIn 0.5s ease-out 0.6s forwards;
           "
           onmouseover="this.style.transform='scale(1.12)'; this.style.boxShadow='0 10px 28px rgba(37,211,102,0.6)';"
           onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 6px 20px rgba(37,211,102,0.45)';">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
        </a>
        <style>@keyframes fabFadeIn { to { opacity: 1; } }</style>
    `;
    document.body.insertAdjacentHTML('beforeend', modalsHTML);

    const nameP = document.getElementById('checkout-name');
    const phoneP = document.getElementById('checkout-phone');
    const addressP = document.getElementById('checkout-address');
    if (nameP) {
        nameP.value = localStorage.getItem('parinay_c_n') || '';
        nameP.addEventListener('input', e => localStorage.setItem('parinay_c_n', e.target.value));
    }
    if (phoneP) {
        phoneP.value = localStorage.getItem('parinay_c_p') || '';
        phoneP.addEventListener('input', e => localStorage.setItem('parinay_c_p', e.target.value));
    }
    if (addressP) {
        addressP.value = localStorage.getItem('parinay_c_a') || '';
        addressP.addEventListener('input', e => localStorage.setItem('parinay_c_a', e.target.value));
    }
});

window.addEventListener('storage', function(e) {
    if (e.key === 'parinay_cart') {
        try {
            cartItems = JSON.parse(e.newValue || '[]');
            updateCartIcon();
            const cartModal = document.getElementById('cart-modal');
            if (cartModal && cartModal.style.display !== 'none') openCart();
        } catch(err) {}
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const prodModal = document.getElementById('product-details-modal');
        if (prodModal) {
            prodModal.remove();
            if (history.pushState) history.pushState(null, null, window.location.pathname);
        }
        
        const cartModal = document.getElementById('cart-modal');
        if (cartModal && cartModal.style.display !== 'none') {
            if (typeof closeCart === 'function') closeCart();
        }
        
        const searchInput = document.getElementById('nav-search-input');
        if (searchInput && document.activeElement === searchInput) {
            searchInput.blur();
            if (typeof toggleSearch === 'function' && searchInput.style.width !== '0px') toggleSearch();
        }
    }
    
    if (e.key === 'ArrowLeft') {
        const t = document.getElementById('product-carousel-track');
        if (t) {
            if(Math.round(t.scrollLeft)<=0) t.scrollTo({left:t.scrollWidth, behavior:'smooth'});
            else t.scrollBy({left:-t.clientWidth, behavior:'smooth'});
        }
    }
    
    if (e.key === 'ArrowRight') {
        const t = document.getElementById('product-carousel-track');
        if (t) {
            if(Math.round(t.scrollLeft)>=Math.round(t.scrollWidth-t.clientWidth)) t.scrollTo({left:0, behavior:'smooth'});
            else t.scrollBy({left:t.clientWidth, behavior:'smooth'});
        }
    }

    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.getElementById('nav-search-input');
        if (searchInput) {
            if(searchInput.style.width === '0px' || searchInput.style.opacity === '0' || !searchInput.style.width) {
               if(typeof toggleSearch === 'function') toggleSearch();
            }
            searchInput.focus();
        }
    }
});

// ─── UNIFIED PAGE LOGIC ──────────────────────────────────────────────────
window.loadAppView = function(applyCallback) {
    const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';
    if (isPreview) {
        try {
            const raw = localStorage.getItem('parinay_preview_data');
            if (raw) {
                const data = JSON.parse(raw);
                const banner = document.createElement('div');
                banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:#d69e2e;color:#1a1a1a;text-align:center;padding:8px 16px;font-size:0.85rem;font-weight:700;z-index:99999;letter-spacing:0.02em;';
                banner.innerHTML = '⚠️ PREVIEW MODE — These changes are <u>not published</u> yet. Commit from the admin panel to go live. <button onclick="this.parentElement.remove()" style="margin-left:12px;background:transparent;border:1px solid currentColor;border-radius:4px;padding:1px 8px;cursor:pointer;font-weight:700;">✕</button>';
                document.body.prepend(banner);
                applyCallback(data);
                return;
            }
        } catch(e) { console.error('Preview error:', e); }
    }
    if (window.siteData) {
        applyCallback(window.siteData);
    } else {
        window.addEventListener('siteDataReady', () => applyCallback(window.siteData), { once: true });
    }
};

window.initProductCollection = function(categoryStr, keys) {
    let allProducts = [];
    let filteredProducts = [];
    let currentlyShown = 0;
    const PAGE_SIZE = 12;

    function getPrice(p) { return parseFloat(String(p.price).replace(/[^0-9.]/g, '')) || 0; }

    function updateCount() {
        const el = document.getElementById('product-count');
        if (!el) return;
        const shown = Math.min(currentlyShown, filteredProducts.length);
        const total = filteredProducts.length;
        el.textContent = total > 0 ? `Showing ${shown} of ${total} products` : 'No products found';
    }

    function loadMore() {
        const grid = document.getElementById('products-grid');
        const nextBatch = filteredProducts.slice(currentlyShown, currentlyShown + PAGE_SIZE);
        nextBatch.forEach(product => grid.appendChild(window.buildProductCard(product, categoryStr)));
        currentlyShown += nextBatch.length;
        updateCount();

        let trigger = document.getElementById('scroll-trigger');
        if (currentlyShown < filteredProducts.length) {
            if (!trigger) {
                trigger = document.createElement('div');
                trigger.id = 'scroll-trigger';
                trigger.style.cssText = 'height: 50px; margin: 2rem auto; width: 100%; display: flex; justify-content: center; align-items: center; color: var(--text-muted); opacity: 0.7;';
                trigger.innerHTML = '<span class="spinner" style="display:inline-block; width:24px; height:24px; border:3px solid rgba(0,0,0,0.1); border-radius:50%; border-top-color:var(--primary-color); animation:spin 1s ease-in-out infinite;"></span><style>@keyframes spin{to{transform:rotate(360deg);}}</style>';
                grid.parentNode.appendChild(trigger);
                
                const observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                        loadMore();
                    }
                }, { rootMargin: '200px' });
                observer.observe(trigger);
                
                trigger._observer = observer;
            }
        } else if (trigger) {
            if (trigger._observer) trigger._observer.disconnect();
            trigger.remove();
        }
    }

    function applyFilters() {
        const sort  = document.getElementById('sort-select').value;
        const badge = document.getElementById('badge-filter').value;

        let result = [...allProducts];
        if (badge !== 'all') result = result.filter(p => p.badge === badge);

        if (sort === 'price-asc')  result.sort((a, b) => getPrice(a) - getPrice(b));
        if (sort === 'price-desc') result.sort((a, b) => getPrice(b) - getPrice(a));

        filteredProducts = result;
        currentlyShown = 0;

        const grid = document.getElementById('products-grid');
        grid.innerHTML = '';
        const oldTrigger = document.getElementById('scroll-trigger');
        if (oldTrigger) {
            if (oldTrigger._observer) oldTrigger._observer.disconnect();
            oldTrigger.remove();
        }
        updateCount();
        loadMore();
    }

    window.applyFilters = applyFilters;
    
    function applyData(data) {
        const hero = document.getElementById('dynamic-hero');
        if (hero) hero.style.background = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('${data.site_config[keys.cover]}') center/cover`;
        if (document.getElementById('dynamic-title')) document.getElementById('dynamic-title').innerText = data.site_config[keys.title];
        if (document.getElementById('dynamic-subtitle')) document.getElementById('dynamic-subtitle').innerText = data.site_config[keys.subtitle];
        
        const rawProducts = data.products[categoryStr] || [];
        allProducts = rawProducts.filter(p => !p.status || p.status === 'live');
        if (typeof window.injectPageSchema === 'function') window.injectPageSchema(allProducts);
        applyFilters();
        
        if (window.location.hash) {
            const hashId = window.location.hash.substring(1);
            const specificProd = rawProducts.find(p => p.id === hashId);
            if (specificProd) {
                const stat = specificProd.status || 'live';
                if (stat === 'archived' || stat === 'hidden') {
                    window.location.hash = '';
                } else {
                    if (typeof window.showProductDetails === 'function') {
                        window.showProductDetails(specificProd, categoryStr === 'sarees');
                    }
                }
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => window.loadAppView(applyData));

    window.addEventListener('scroll', () => {
        const btn = document.getElementById('back-to-top');
        if (btn) btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
};
