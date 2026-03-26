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
            item.innerHTML = `
                <div class="product-info">
                    <img src="${prod.image}" onerror="this.src='https://via.placeholder.com/40'">
                    <div>
                        <strong>${prod.name}</strong><br>
                        <small style="color:#666;">${prod.price}</small>
                    </div>
                </div>
                <button class="btn-red" onclick="app.removeProduct('${category}', ${index})">Remove</button>
            `;
            list.appendChild(item);
        });
    },

    addProduct() {
        const category = document.getElementById('add-category').value;
        const name = document.getElementById('add-name').value;
        const price = document.getElementById('add-price').value;
        const image = document.getElementById('add-image').value;

        if (!name || !price || !image) {
            alert('Please fill out Name, Price, and Image URL.');
            return;
        }

        const newId = 'p' + Date.now();
        this.data.products[category].push({ id: newId, name, price, image, style: '' });

        // Reset form
        document.getElementById('add-name').value = '';
        document.getElementById('add-price').value = '';
        document.getElementById('add-image').value = '';

        // Update list if showing same category
        if (document.getElementById('manage-category').value === category) {
            this.renderProducts();
        }
        this.showToast('Product added to memory! Click "Commit Changes" to save to GitHub.');
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
        } catch(err) {
            alert(err.message);
        }
    }
};
