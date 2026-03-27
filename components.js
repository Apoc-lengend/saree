class SiteNavbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <nav class="navbar" id="navbar">
                <a href="index.html" class="logo">
                    <img src="assets/logo.png" alt="Parinay Saree Logo" onerror="this.style.display='none'">
                    <span class="logo-text">Parinay <span>Saree</span></span>
                </a>
                <ul class="nav-links">
                    <li><a href="index.html">Home</a></li>
                    <li><a href="index.html#collections">Collections</a></li>
                    <li><a href="index.html#about">About Us</a></li>
                    <li><a href="index.html#contact">Contact</a></li>
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

let cartItems = JSON.parse(localStorage.getItem('parinay_cart')) || [];

function addToCart(name, priceStr, imageSrc) {
    let priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    if (isNaN(priceNum)) priceNum = 0;
    cartItems.push({ name, price: priceNum, priceStr, image: imageSrc || 'assets/saree.png' });
    localStorage.setItem('parinay_cart', JSON.stringify(cartItems));
    updateCartIcon();
}

function updateCartIcon() {
    let countEl = document.getElementById('cart-count');
    let orderNowBtn = document.getElementById('nav-order-now-btn');
    if (countEl) countEl.innerText = cartItems.length;
    
    if (orderNowBtn) {
        orderNowBtn.style.display = cartItems.length > 0 ? 'block' : 'none';
    }
}

window.siteConfigData = null;
fetch('data.json').then(r=>r.json()).then(d=>{ window.siteConfigData = d.site_config; }).catch(e=>{});

window.buildProductCard = function(product) {
    const discount = product.discount || 0;
    const stock = product.stock !== undefined ? product.stock : 10;
    const isOutOfStock = stock <= 0;
    const badge = product.badge || '';
    const priceNum = parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0;
    let priceHTML = '';
    if (discount > 0) {
        const msrp = Math.round(priceNum / (1 - discount / 100));
        priceHTML = `<span class="original-price">₹${msrp.toLocaleString('en-IN')}</span><span class="selling-price">₹${priceNum.toLocaleString('en-IN')}</span>`;
    } else {
        priceHTML = `<span class="selling-price">${product.price}</span>`;
    }
    const leftBadge = discount > 0 ? `<div class="product-badge-wrap"><span class="badge-discount">${discount}% Off</span></div>` : '';
    const labelMap = { new: 'label-new', sale: 'label-sale', trending: 'label-trending' };
    const rightBadge = badge && labelMap[badge] ? `<span class="product-label-badge ${labelMap[badge]}">${badge}</span>` : '';
    const overlay = isOutOfStock ? '' : `<div class="product-card-overlay"><button onclick="addToCart('${product.name.replace(/'/g,"\\\\'")}', '${product.price}', '${product.image}')">Add to Cart</button></div>`;
    const card = document.createElement('div');
    card.className = 'product-card' + (isOutOfStock ? ' out-of-stock' : '');
    card.innerHTML = `<div class="product-card-img"><img src="${product.image}" alt="${product.name}" style="${product.style || ''}">${leftBadge}${rightBadge}${overlay}</div><div class="product-card-info"><h3 title="${product.name}">${product.name}</h3><div class="price-row">${priceHTML}</div></div>`;
    return card;
};

function openCart() {
    let modal = document.getElementById('cart-modal');
    if (!modal) return;
    let listEl = document.getElementById('cart-items-list');
    listEl.innerHTML = '';
    let subtotal = 0;
    cartItems.forEach((item, index) => {
        subtotal += item.price;
        listEl.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:8px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${item.image}" style="width:50px; height:50px; border-radius:6px; object-fit:cover; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                    <span style="font-weight:600; font-size: 0.95rem;">${item.name}</span>
                </div>
                <span style="color:var(--primary-color); font-weight:bold; white-space:nowrap; margin-left:10px;">${item.priceStr} 
                    <button onclick="removeFromCart(${index})" style="background:#ef4444; color:white; border:none; padding:3px 7px; cursor:pointer; margin-left:8px; border-radius:4px; font-weight:bold;">X</button>
                </span>
            </div>`;
    });

    let deliveryCost = 0;
    let deliveryText = 'Free Delivery';
    if (window.siteConfigData && window.siteConfigData.delivery_value) {
        let dv = window.siteConfigData.delivery_value;
        if (!isNaN(parseFloat(dv)) && parseFloat(dv) > 0) {
            deliveryCost = parseFloat(dv);
            deliveryText = '₹' + deliveryCost.toLocaleString('en-IN');
        } else {
            deliveryText = dv;
        }
    }

    let gst = subtotal * 0.05;
    let total = subtotal + gst + deliveryCost;
    document.getElementById('cart-subtotal').innerText = '₹' + subtotal.toLocaleString('en-IN');
    document.getElementById('cart-gst').innerText = '₹' + gst.toLocaleString('en-IN');
    document.getElementById('cart-delivery').innerText = deliveryText;
    document.getElementById('cart-total').innerText = '₹' + total.toLocaleString('en-IN');
    modal.style.display = 'flex';
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
        subtotal += item.price;
        orderText += `- ${item.name} (${item.priceStr})%0A`;
    });

    let deliveryCost = 0;
    let deliveryText = 'Free Delivery';
    if (window.siteConfigData && window.siteConfigData.delivery_value) {
        let dv = window.siteConfigData.delivery_value;
        if (!isNaN(parseFloat(dv)) && parseFloat(dv) > 0) {
            deliveryCost = parseFloat(dv);
            deliveryText = '₹' + deliveryCost.toLocaleString('en-IN');
        } else {
            deliveryText = dv;
        }
    }

    let gst = subtotal * 0.05;
    let total = subtotal + gst + deliveryCost;
    orderText += `%0A*Subtotal:* ₹${subtotal.toLocaleString('en-IN')}%0A*GST (5%):* ₹${gst.toLocaleString('en-IN')}%0A*Delivery:* ${deliveryText}%0A*Total:* ₹${total.toLocaleString('en-IN')}%0A`;
    localStorage.removeItem('parinay_cart');
    cartItems = [];
    updateCartIcon();
    closeCheckout();
    let whatsappUrl = `https://wa.me/919876543210?text=${orderText}`;
    window.open(whatsappUrl, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartIcon();
    const modalsHTML = `
        <div id="cart-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(45,26,16,0.6); z-index:2000; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
            <div style="background:white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; color: #333; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                <h2 style="margin-bottom: 1rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; color:var(--primary-color); font-family:'Playfair Display', serif;">Your Order Cart</h2>
                <div id="cart-items-list" style="max-height: 300px; overflow-y: auto; margin-bottom: 1.5rem; padding-right:5px;"></div>
                <div style="border-top: 2px solid #eee; padding-top: 1rem;">
                    <p style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-weight:500;"><span>Subtotal:</span> <span id="cart-subtotal">₹0</span></p>
                    <p style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:#6b7280; font-weight:500;"><span>GST (5%):</span> <span id="cart-gst">₹0</span></p>
                    <p style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:#6b7280; font-weight:500;"><span>Delivery:</span> <span id="cart-delivery" style="color:#25D366; font-weight:700;">Free Delivery</span></p>
                    <h3 style="display:flex; justify-content:space-between; margin-top:0.8rem; color:var(--primary-color); font-size:1.4rem;"><span>Total:</span> <span id="cart-total">₹0</span></h3>
                </div>
                <div style="display:flex; justify-content:flex-end; gap: 1rem; margin-top: 2rem;">
                    <button onclick="closeCart()" style="padding: 0.8rem 1.5rem; border:1px solid #ccc; background:#f9fafb; cursor:pointer; border-radius:6px; font-weight:600; font-family:inherit;">Keep Shopping</button>
                    <button onclick="openCheckout()" style="padding: 0.8rem 1.5rem; background:var(--primary-color); color:white; border:none; cursor:pointer; border-radius:6px; font-weight:bold; box-shadow:0 4px 10px rgba(123,19,56,0.3); font-family:inherit;">Checkout Now</button>
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
});
