const app = {
    auth: { username: '', repo: '', token: '' },
    data: null,
    fileSha: '',

    showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 3000);
    },

    async login() {
        this.auth.username = document.getElementById('github-username').value;
        this.auth.repo = document.getElementById('github-repo').value;
        this.auth.token = document.getElementById('github-token').value;

        if (!this.auth.username || !this.auth.repo || !this.auth.token) {
            alert('Please fill out all fields first!');
            return;
        }

        try {
            const res = await fetch(`https://api.github.com/repos/${this.auth.username}/${this.auth.repo}/contents/data.json`, {
                headers: { 'Authorization': `token ${this.auth.token}` }
            });

            if (!res.ok) throw new Error('Could not fetch data.json. Check your Token and Repo name.');

            const fileData = await res.json();
            this.fileSha = fileData.sha;

            // Handle Base64 decode safely
            const jsonText = decodeURIComponent(escape(window.atob(fileData.content.replace(/\n/g, ''))));
            this.data = JSON.parse(jsonText);

            // Switch UI
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('dashboard-screen').style.display = 'block';
            document.getElementById('repo-display').innerText = `${this.auth.username}/${this.auth.repo}`;

            this.populateConfig();
            this.renderProducts();
            this.showToast('Successfully connected!');

        } catch (err) {
            alert(err.message);
        }
    },

    populateConfig() {
        document.getElementById('cfg-hero-cover').value = this.data.site_config.hero_cover || '';
        document.getElementById('cfg-sarees-cover').value = this.data.site_config.sarees_cover || '';
        document.getElementById('cfg-bedsheets-cover').value = this.data.site_config.bedsheets_cover || '';
        document.getElementById('cfg-blankets-cover').value = this.data.site_config.blankets_cover || '';
        document.getElementById('cfg-pillows-cover').value = this.data.site_config.pillows_cover || '';
        document.getElementById('cfg-delivery-value').value = this.data.site_config.delivery_value || 'Free Delivery';
        document.getElementById('cfg-whatsapp').value = this.data.site_config.whatsapp_number || '919876543210';
    },

    updateConfig(key, value) {
        if (!this.data.site_config) this.data.site_config = {};
        this.data.site_config[key] = value;
    },

    renderProducts() {
        const category = document.getElementById('manage-category').value;
        const list = document.getElementById('product-list');
        list.innerHTML = '';

        if (!this.data.products[category]) this.data.products[category] = [];

        this.data.products[category].forEach((prod, index) => {
            const item = document.createElement('div');
            item.className = 'product-item';
            // Align items gracefully with gap
            item.style.alignItems = "flex-start";
            item.innerHTML = `
                <div class="product-info" style="flex:1;">
                    <img src="${prod.image}" onerror="this.src='https://via.placeholder.com/40'" style="margin-top:5px;">
                    <div style="flex:1;">
                        <strong>${prod.name}</strong><br>
                        <small style="color:#666;">${prod.price}</small>
                        <div style="margin-top:8px; display:flex; gap:10px; font-size:0.85rem; flex-wrap:wrap;">
                            <label>Stock: <input type="number" style="width:60px; padding:3px; border:1px solid #ccc; border-radius:3px;" value="${prod.stock !== undefined ? prod.stock : 10}" onchange="app.updateProduct('${category}', ${index}, 'stock', this.value)"></label>
                            <label>Discount(%): <input type="number" style="width:60px; padding:3px; border:1px solid #ccc; border-radius:3px;" value="${prod.discount || 0}" onchange="app.updateProduct('${category}', ${index}, 'discount', this.value)"></label>
                            <label>Badge:
                                <select style="padding:3px; border:1px solid #ccc; border-radius:3px;" onchange="app.updateProduct('${category}', ${index}, 'badge', this.value)">
                                    <option value="" ${!prod.badge ? 'selected' : ''}>None</option>
                                    <option value="new" ${prod.badge === 'new' ? 'selected' : ''}>🟢 New</option>
                                    <option value="sale" ${prod.badge === 'sale' ? 'selected' : ''}>🔴 Sale</option>
                                    <option value="trending" ${prod.badge === 'trending' ? 'selected' : ''}>🟣 Trending</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </div>
                <button class="btn-red" onclick="app.removeProduct('${category}', ${index})" style="margin-left:10px; margin-top:5px;">Remove</button>
            `;
            list.appendChild(item);
        });
    },

    addProduct() {
        const category = document.getElementById('add-category').value;
        const name = document.getElementById('add-name').value;
        let price = document.getElementById('add-price').value;
        const image = document.getElementById('add-image').value;
        const stock = parseInt(document.getElementById('add-stock').value) || 0;
        const discount = parseInt(document.getElementById('add-discount').value) || 0;
        const badge = document.getElementById('add-badge').value;
        const dateAdded = new Date().toISOString();

        if (!name || !price || !image) {
            alert('Please fill out Name, Price, and Image URL.');
            return;
        }
        
        const priceNum = parseFloat(price.replace(/[^0-9.]/g, ''));
        if (isNaN(priceNum)) {
            alert('Please enter a valid numerical price.');
            return;
        }
        price = '₹' + priceNum;

        const newId = 'p' + Date.now();
        this.data.products[category].push({ id: newId, name, price, image, style: '', stock, discount, badge, dateAdded });

        // Reset form
        document.getElementById('add-name').value = '';
        document.getElementById('add-price').value = '';
        document.getElementById('add-image').value = '';
        document.getElementById('add-stock').value = '10';
        document.getElementById('add-discount').value = '0';
        document.getElementById('add-badge').value = '';

        // Update list if showing same category
        if (document.getElementById('manage-category').value === category) {
            this.renderProducts();
        }
        this.showToast('Product added to memory! Click "Commit Changes" to save to GitHub.');
    },

    updateProduct(category, index, field, value) {
        if (field === 'stock' || field === 'discount') {
            value = parseInt(value) || 0;
        }
        this.data.products[category][index][field] = value;
        this.showToast('Updated! Click "Commit Changes" to deploy.');
    },

    removeProduct(category, index) {
        if (confirm('Are you sure you want to remove this product?')) {
            this.data.products[category].splice(index, 1);
            this.renderProducts();
            this.showToast('Product removed! Click "Commit Changes" to save to GitHub.');
        }
    },

    async saveChanges() {
        if (!confirm('This will immediately update your website. Continue?')) return;

        const jsonText = JSON.stringify(this.data, null, 2);
        // Safely encode to base64
        const contentBase64 = window.btoa(unescape(encodeURIComponent(jsonText)));

        try {
            const res = await fetch(`https://api.github.com/repos/${this.auth.username}/${this.auth.repo}/contents/data.json`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.auth.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: "Admin Dashboard: Updated website content",
                    content: contentBase64,
                    sha: this.fileSha
                })
            });

            if (!res.ok) throw new Error('Failed to commit to GitHub.');

            const resData = await res.json();
            this.fileSha = resData.content.sha; // Update SHA for next commit

            this.showToast('Success! Your changes were saved. GitHub Pages will deploy them in a few minutes.');
        } catch (err) {
            alert(err.message);
        }
    }
};