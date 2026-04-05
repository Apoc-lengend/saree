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
            let jsonText = decodeURIComponent(escape(window.atob(fileData.content.replace(/\s/g, ''))));
            
            // Clean up invisible characters or BOMs around the JSON payload
            const startIdx = jsonText.indexOf('{');
            if (startIdx > 0) jsonText = jsonText.substring(startIdx);
            const endIdx = jsonText.lastIndexOf('}');
            if (endIdx !== -1) jsonText = jsonText.substring(0, endIdx + 1);

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
                            <label>Desc: <input type="text" style="width:120px; padding:3px; border:1px solid #ccc; border-radius:3px;" value="${prod.description || ''}" onchange="app.updateProduct('${category}', ${index}, 'description', this.value)"></label>
                            <label>More Img: <input type="text" style="width:120px; padding:3px; border:1px solid #ccc; border-radius:3px;" value="${(prod.more_images || []).join(', ')}" onchange="app.updateProduct('${category}', ${index}, 'more_images', this.value.split(',').map(s=>s.trim()).filter(s=>s))"></label>
                        </div>
                    </div>
                </div>
                <button class="btn-red" onclick="app.removeProduct('${category}', ${index})" style="margin-left:10px; margin-top:5px;">Remove</button>
            `;
            list.appendChild(item);
        });
    },

    async compressAndUpload(file, category) {
        return new Promise((resolve, reject) => {
            const maxKB = 99;
            const processFile = async (base64Data) => {
                const b64 = base64Data.split(',')[1];
                const path = `assets/${category}/${file.name.replace(/\s+/g, '-')}`;
                let sha = null;
                try {
                    const getRes = await fetch(`https://api.github.com/repos/${app.auth.username}/${app.auth.repo}/contents/${path}`, {
                         headers: { 'Authorization': `token ${app.auth.token}` }
                    });
                    if (getRes.ok) sha = (await getRes.json()).sha;
                } catch(e) {}

                const body = { message: `Upload ${file.name}`, content: b64 };
                if (sha) body.sha = sha;

                const putRes = await fetch(`https://api.github.com/repos/${app.auth.username}/${app.auth.repo}/contents/${path}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `token ${app.auth.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (!putRes.ok) reject('Failed to upload ' + file.name);
                else resolve(path);
            };

            const reader = new FileReader();
            reader.onload = function(e) {
                if (file.size <= maxKB * 1024) { processFile(e.target.result); return; }
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width; let height = img.height;
                    const maxDim = 1200;
                    if (width > maxDim || height > maxDim) {
                        if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
                        else { width = Math.round((width * maxDim) / height); height = maxDim; }
                    }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    let quality = 0.8;
                    let compressedUrl = canvas.toDataURL('image/jpeg', quality);
                    while(compressedUrl.length * 0.75 > maxKB * 1024 && quality > 0.3) {
                        quality -= 0.1;
                        compressedUrl = canvas.toDataURL('image/jpeg', quality);
                    }
                    processFile(compressedUrl);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    async addProduct() {
        const category = document.getElementById('add-category').value;
        const name = document.getElementById('add-name').value;
        let price = document.getElementById('add-price').value;
        const mainImageFile = document.getElementById('add-image').files[0];
        const moreImageFiles = document.getElementById('add-more-images').files;
        const stock = parseInt(document.getElementById('add-stock').value) || 0;
        const discount = parseInt(document.getElementById('add-discount').value) || 0;
        const badge = document.getElementById('add-badge').value;
        const description = document.getElementById('add-desc').value;
        const dateAdded = new Date().toISOString();

        if (!name || !price || !mainImageFile) {
            alert('Please fill out Name, Price, and select a Front Image.');
            return;
        }

        const priceNum = parseFloat(price.replace(/[^0-9.]/g, ''));
        if (isNaN(priceNum)) {
            alert('Please enter a valid numerical price.');
            return;
        }
        price = '₹' + priceNum;

        const btn = document.querySelector('button[onclick="app.addProduct()"]');
        if (btn) { btn.innerText = "Uploading..."; btn.disabled = true; }

        let image = '';
        let more_images = [];
        try {
            this.showToast('Uploading main image...');
            image = await this.compressAndUpload(mainImageFile, category);
            
            for (let i = 0; i < moreImageFiles.length; i++) {
                this.showToast(`Uploading extra image ${i+1}/${moreImageFiles.length}...`);
                const extraPath = await this.compressAndUpload(moreImageFiles[i], category);
                more_images.push(extraPath);
            }
        } catch(e) {
            alert('Error uploading files: ' + e);
            if (btn) { btn.innerText = "Add Product"; btn.disabled = false; }
            return;
        }
        
        if (btn) { btn.innerText = "Add Product"; btn.disabled = false; }

        const newId = 'p' + Date.now();
        this.data.products[category].push({ id: newId, name, price, image, style: '', stock, discount, badge, description, more_images, dateAdded });

        // Reset form
        document.getElementById('add-name').value = '';
        document.getElementById('add-price').value = '';
        document.getElementById('add-image').value = '';
        document.getElementById('add-stock').value = '10';
        document.getElementById('add-discount').value = '0';
        document.getElementById('add-badge').value = '';
        document.getElementById('add-desc').value = '';
        document.getElementById('add-more-images').value = '';


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