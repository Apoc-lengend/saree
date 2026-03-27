class SiteNavbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <nav class="navbar" id="navbar">
                <div class="logo">Aditi Textiles</div>
                <ul class="nav-links">
                    <li><a href="index.html">Home</a></li>
                    <li><a href="collections.html">Collections</a></li>
                    <li><a href="index.html#about">About Us</a></li>
                    <li><a href="index.html#contact">Contact</a></li>
                </ul>
                <div class="nav-actions" style="margin-left: 2rem; display: flex; align-items: center; gap: 1.5rem;">
                    <a href="javascript:void(0)" onclick="openCart()" style="position: relative; text-decoration: none; color: var(--heading-color); display: flex; transition: opacity 0.3s ease;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <span id="cart-count" style="position: absolute; top: -8px; right: -12px; background: var(--primary-color); color: white; border-radius: 50%; min-width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; padding: 0 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">0</span>
                    </a>
                    <button class="lang-switcher-btn"
                        style="padding: 0.4rem 1.2rem; cursor: pointer; border-radius: 30px; font-weight: 600; border: 1.5px solid var(--heading-color); background: transparent; color: var(--heading-color); font-family: inherit; font-size: 0.95rem; transition: all 0.3s ease;"
                        onmouseover="this.style.background='var(--heading-color)'; this.style.color='var(--bg-color)';"
                        onmouseout="this.style.background='transparent'; this.style.color='var(--heading-color)';"
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
                    <div class="footer-logo">Aditi Textiles</div>
                    <p>123 Elegance Avenue, Silk District, Textile City</p>
                    <p>Email: contact@adititextiles.com | Phone: +1 (555) 123-4567</p>
                </div>
                <p>&copy; 2026 Aditi Textiles. All rights reserved. Designed with precision and passion.</p>
            </footer>
        `;
    }
}

customElements.define('site-navbar', SiteNavbar);
customElements.define('site-footer', SiteFooter);

// Handle Navbar scroll effect globally
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.9)';
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.05)';
        }
    }
});

// --- Cart and Checkout System ---
let cartItems = JSON.parse(localStorage.getItem('aditi_cart')) || [];

function addToCart(name, priceStr) {
    let priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    if (isNaN(priceNum)) priceNum = 0;
    cartItems.push({ name, price: priceNum, priceStr });
    localStorage.setItem('aditi_cart', JSON.stringify(cartItems));
    updateCartIcon();
    alert(name + " added to cart!");
}

function updateCartIcon() {
    let countEl = document.getElementById('cart-count');
    if (countEl) countEl.innerText = cartItems.length;
}

function openCart() {
    let modal = document.getElementById('cart-modal');
    if (!modal) return;

    let listEl = document.getElementById('cart-items-list');
    listEl.innerHTML = '';

    let subtotal = 0;
    cartItems.forEach((item, index) => {
        subtotal += item.price;
        listEl.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
            <span style="font-weight:500;">${item.name}</span>
            <span style="color:#c2410c; font-weight:bold;">${item.priceStr} <button onclick="removeFromCart(${index})" style="background:#e74c3c; color:white; border:none; padding:2px 6px; cursor:pointer; margin-left:10px; border-radius:4px; font-weight:bold;">X</button></span>
        </div>`;
    });

    let gst = subtotal * 0.18;
    let total = subtotal + gst;

    document.getElementById('cart-subtotal').innerText = subtotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    document.getElementById('cart-gst').innerText = gst.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    document.getElementById('cart-total').innerText = total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    modal.style.display = 'flex';
}

function removeFromCart(index) {
    cartItems.splice(index, 1);
    localStorage.setItem('aditi_cart', JSON.stringify(cartItems));
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

    if (!name || !phone) { alert("Please enter both Name and Mobile No. to proceed."); return; }

    let orderText = `*Hello Aditi Textiles!* I would like to place an order.%0A%0A*Name:* ${name}%0A*Phone:* ${phone}%0A%0A*Order Details:*%0A`;

    let subtotal = 0;
    cartItems.forEach(item => {
        subtotal += item.price;
        orderText += `- ${item.name} (${item.priceStr})%0A`;
    });

    let gst = subtotal * 0.18;
    let total = subtotal + gst;

    orderText += `%0A*Subtotal:* ${subtotal.toFixed(2)}%0A*GST (18%):* ${gst.toFixed(2)}%0A*Total:* ${total.toFixed(2)}%0A`;

    localStorage.removeItem('aditi_cart');
    cartItems = [];
    updateCartIcon();
    closeCheckout();

    let whatsappUrl = `https://wa.me/919425424981?text=${orderText}`;
    window.location.href = whatsappUrl;
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartIcon();

    const modalsHTML = `
        <div id="cart-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:2000; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
            <div style="background:white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; color: #333; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                <h2 style="margin-bottom: 1rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; color:#111827; font-family:'Playfair Display', serif;">Your Order Cart</h2>
                <div id="cart-items-list" style="max-height: 300px; overflow-y: auto; margin-bottom: 1.5rem; padding-right:5px;"></div>
                <div style="border-top: 2px solid #eee; padding-top: 1rem;">
                    <p style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-weight:500;"><span>Subtotal:</span> <span id="cart-subtotal">₹0</span></p>
                    <p style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:#6b7280; font-weight:500;"><span>GST (18%):</span> <span id="cart-gst">₹0</span></p>
                    <h3 style="display:flex; justify-content:space-between; margin-top:0.5rem; color:#c2410c; font-size:1.4rem;"><span>Total:</span> <span id="cart-total">₹0</span></h3>
                </div>
                <div style="display:flex; justify-content:flex-end; gap: 1rem; margin-top: 2rem;">
                    <button onclick="closeCart()" style="padding: 0.8rem 1.5rem; border:1px solid #ccc; background:#f9fafb; cursor:pointer; border-radius:6px; font-weight:600;">Keep Shopping</button>
                    <button onclick="openCheckout()" style="padding: 0.8rem 1.5rem; background:#c2410c; color:white; border:none; cursor:pointer; border-radius:6px; font-weight:bold; box-shadow:0 4px 10px rgba(194,65,12,0.3);">Checkout Now</button>
                </div>
            </div>
        </div>

        <div id="checkout-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:2000; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
            <div style="background:white; padding: 2.5rem; border-radius: 12px; max-width: 400px; width: 90%; color: #333; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                <h2 style="margin-bottom: 1.5rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; color:#111827; font-family:'Playfair Display', serif;">Confirm Details</h2>
                <div style="margin-bottom: 1.2rem;">
                    <label style="display:block; margin-bottom:0.5rem; font-weight:600; color:#374151;">Full Name</label>
                    <input type="text" id="checkout-name" placeholder="E.g. Aditi Sharma" style="width:100%; padding:0.8rem; border:1px solid #d1d5db; border-radius:6px; outline:none;">
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display:block; margin-bottom:0.5rem; font-weight:600; color:#374151;">Mobile No.</label>
                    <input type="tel" id="checkout-phone" placeholder="+91 XXXXX XXXXX" style="width:100%; padding:0.8rem; border:1px solid #d1d5db; border-radius:6px; outline:none;">
                </div>
                <div style="display:flex; justify-content:space-between; gap: 1rem; margin-top: 2rem;">
                    <button onclick="closeCheckout()" style="padding: 0.8rem 1.5rem; border:1px solid #ccc; background:#f9fafb; cursor:pointer; border-radius:6px; font-weight:600; width:100%;">Cancel</button>
                    <button onclick="confirmOrder()" style="padding: 0.8rem 1.5rem; background:#25D366; color:white; border:none; cursor:pointer; border-radius:6px; font-weight:bold; box-shadow:0 4px 10px rgba(37,211,102,0.3); width:100%;">Order on WhatsApp</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalsHTML);
});
