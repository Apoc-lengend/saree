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
                <div class="lang-switch" style="margin-left: 2rem;">
                    <button class="lang-switcher-btn"
                        style="padding: 0.3rem 1.2rem; cursor: pointer; border-radius: 20px; font-weight: 600; border: 2px solid var(--primary-color); background: transparent; color: var(--secondary-color); font-family: inherit; font-size: 1rem; transition: all 0.3s ease;"
                        onmouseover="this.style.background='var(--primary-color)'; this.style.color='white';"
                        onmouseout="this.style.background='transparent'; this.style.color='var(--secondary-color)';"
                        onclick="toggleLanguage()">HI</button>
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
