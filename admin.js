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
            const res = await fetch(`https://api.github.com/repos/${this.auth.username}/${this.auth.repo}/contents/data.json?timestamp=${Date.now()}`, {
                headers: { 'Authorization': `token ${this.auth.token}` },
                cache: 'no-store'
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

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const editModal = document.getElementById('admin-edit-modal');
                    if (editModal) editModal.remove();
                }
            });

        } catch (err) {
            alert(err.message);
        }
    },

    populateConfig() {
        document.getElementById('cfg-hero-label').innerHTML = '📁 Hero Cover<br><small style="font-weight:normal;color:#7B1338;">' + (this.data.site_config.hero_cover || '') + '</small>';
        document.getElementById('cfg-sarees-label').innerHTML = '📁 Saree Cover<br><small style="font-weight:normal;color:#7B1338;">' + (this.data.site_config.sarees_cover || '') + '</small>';
        document.getElementById('cfg-bed-label').innerHTML = '📁 Bedsheet Cover<br><small style="font-weight:normal;color:#7B1338;">' + (this.data.site_config.bedsheets_cover || '') + '</small>';
        
        document.getElementById('cfg-delivery-value').value = this.data.site_config.delivery_value || 'Free Delivery';
        document.getElementById('cfg-whatsapp').value = this.data.site_config.whatsapp_number || '919876543210';
    },

    updateConfig(key, value) {
        if (!this.data.site_config) this.data.site_config = {};
        this.data.site_config[key] = value;
    },
    
    async uploadConfigImage(key, file, labelId) {
        if (!file) return;
        const msg = "Pushing to GitHub...";
        document.getElementById(labelId).innerText = msg;
        this.showToast(msg);
        try {
            const path = await this.compressAndUpload(file, 'banners');
            this.updateConfig(key, path);
            this.showToast('Banner saved in memory! Commit to publish.');
            this.populateConfig();
        } catch(e) {
            alert('Upload failed: ' + e);
            document.getElementById(labelId).innerText = "Upload Failed";
        }
    },

    renderProducts() {
        const category = document.getElementById('manage-category').value;
        const list = document.getElementById('product-list');
        list.innerHTML = '';

        if (!this.data.products[category]) this.data.products[category] = [];

        this.data.products[category].forEach((prod, index) => {
            const item = document.createElement('div');
            item.className = 'product-item';
            item.style.alignItems = "flex-start";
            item.style.cursor = "grab";
            item.setAttribute('draggable', 'true');
            item.onclick = (e) => { 
                if (e.target.tagName !== 'BUTTON') app.openEditModal(category, index); 
            };
            
            const extraThumbs = (prod.more_images || []).map(img => `<img src="${img}" style="width:30px; height:30px; border-radius:4px; object-fit:cover; border:1px solid #ccc; pointer-events:none;">`).join('');

            item.innerHTML = `
                <div class="product-info" style="flex:1; pointer-events:none;">
                    <img src="${prod.image}" onerror="this.src='https://via.placeholder.com/40'" style="margin-top:5px; width:50px; height:50px; object-fit:cover; border-radius:4px;">
                    <div style="flex:1;">
                        <strong style="color:#7B1338;">${prod.name}</strong><br>
                        <small style="color:#666;">${prod.price} | Stock: ${prod.stock} | Discount: ${prod.discount}%</small>
                        <div style="display:flex; gap:5px; margin-top:6px; overflow-x:auto;">
                            ${extraThumbs}
                        </div>
                    </div>
                </div>
                <button class="btn-red" onclick="app.removeProduct('${category}', ${index})" style="margin-left:10px; margin-top:10px; padding:6px 12px; font-size:0.85rem;">Delete</button>
            `;
            
            item.addEventListener('dragstart', e => {
                e.dataTransfer.setData('sourceIndex', index);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => item.style.opacity = '0.5', 0);
            });
            item.addEventListener('dragend', () => item.style.opacity = '1');
            item.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
            item.addEventListener('drop', e => {
                e.preventDefault();
                let sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'));
                if (sourceIndex === index || isNaN(sourceIndex)) return;
                
                const draggedItem = this.data.products[category][sourceIndex];
                this.data.products[category].splice(sourceIndex, 1);
                
                let targetIndex = index;
                if (sourceIndex < targetIndex) targetIndex--;
                
                this.data.products[category].splice(targetIndex, 0, draggedItem);
                
                this.renderProducts();
                this.showToast('Reordered! Click "Commit Changes" to deploy.');
            });

            list.appendChild(item);
        });
    },

    openEditModal(category, index) {
        const prod = this.data.products[category][index];
        const oldModal = document.getElementById('admin-edit-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = 'admin-edit-modal';
        modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(3px);";
        
        let extraThumbsHTML = (prod.more_images || []).map((img, i) => `
            <div style="position:relative; display:inline-block;">
                <img src="${img}" style="width:60px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #ddd;">
                <button onclick="app.removeExtraImage('${category}', ${index}, ${i})" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center;">&times;</button>
            </div>
        `).join('');

        modal.innerHTML = `
            <div style="background:white; padding:25px; border-radius:8px; width:90%; max-width:500px; max-height:90vh; overflow-y:auto; color:#333; position:relative;" onclick="event.stopPropagation()">
                <button onclick="document.getElementById('admin-edit-modal').remove()" style="position:absolute; top:15px; right:15px; background:transparent; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
                <h2 style="margin-bottom:15px; color:#7B1338;">Edit Product</h2>
                
                <div style="display:flex; gap:15px; margin-bottom:15px;">
                    <img src="${prod.image}" style="width:90px; height:90px; object-fit:cover; border-radius:6px; border:1px solid #eee;">
                    <div style="flex:1; display:flex; flex-direction:column; gap:10px;">
                        <input type="text" id="edit-name" value="${prod.name.replace(/"/g, '&quot;')}" style="padding:8px; border:1px solid #ccc; width:100%; border-radius:4px;">
                        <input type="text" id="edit-price" value="${prod.price.replace(/"/g, '&quot;')}" style="padding:8px; border:1px solid #ccc; width:100%; border-radius:4px;">
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <label style="font-size:0.85rem; font-weight:bold;">Stock <input type="number" id="edit-stock" value="${prod.stock}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-top:4px;"></label>
                    <label style="font-size:0.85rem; font-weight:bold;">Discount(%) <input type="number" id="edit-discount" value="${prod.discount}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-top:4px;"></label>
                </div>
                
                <label style="font-size:0.85rem; font-weight:bold; display:block; margin-bottom:10px;">Description
                    <textarea id="edit-desc" style="width:100%; padding:8px; height:70px; border:1px solid #ccc; border-radius:4px; margin-top:4px;">${prod.description || ''}</textarea>
                </label>
                
                <label style="font-size:0.85rem; font-weight:bold; display:block; margin-bottom:15px;">Badge
                    <select id="edit-badge" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-top:4px;">
                        <option value="" ${!prod.badge ? 'selected' : ''}>None</option>
                        <option value="new" ${prod.badge === 'new' ? 'selected' : ''}>🟢 New</option>
                        <option value="sale" ${prod.badge === 'sale' ? 'selected' : ''}>🔴 Sale</option>
                        <option value="trending" ${prod.badge === 'trending' ? 'selected' : ''}>🟣 Trending</option>
                    </select>
                </label>

                <div style="margin-bottom:20px; padding:10px; background:#f9f9f9; border-radius:6px;">
                    <h4 style="margin-bottom:10px; font-size:0.95rem;">Additional Images</h4>
                    <div id="extra-thumbs-container" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
                        ${extraThumbsHTML}
                    </div>
                    <label for="edit-upload-more" id="edit-upload-label" style="display:inline-block; background:#fff; border:1px dashed #999; padding:6px 12px; cursor:pointer; font-size:0.85rem; font-weight:bold; border-radius:4px;">+ Upload More Photos</label>
                    <input type="file" id="edit-upload-more" multiple accept="image/*" style="display:none;" onchange="app.uploadExtraImagesForEdit('${category}', ${index}, this.files)">
                </div>

                <div style="display:flex; justify-content:space-between;">
                    <button onclick="document.getElementById('admin-edit-modal').remove()" style="background:#f1f1f1; border:1px solid #ccc; padding:10px 15px; border-radius:4px; cursor:pointer; font-weight:bold;">Cancel</button>
                    <button onclick="app.saveEditModal('${category}', ${index})" style="background:#7B1338; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:bold;">Save Changes</button>
                </div>
            </div>
        `;
        modal.onclick = () => modal.remove();
        document.body.appendChild(modal);
    },

    removeExtraImage(category, index, imgIndex) {
        if (!confirm('Remove this extra image? It will be permanently deleted from GitHub if unused.')) return;
        const imgPath = this.data.products[category][index].more_images[imgIndex];
        this.data.products[category][index].more_images.splice(imgIndex, 1);
        if (imgPath) this.deleteFileFromGitHub(imgPath);
        this.showToast('Removed Extra Image.');
        document.getElementById('admin-edit-modal').remove();
        this.openEditModal(category, index);
    },

    async uploadExtraImagesForEdit(category, index, files) {
        if (!files.length) return;
        const uploadLabel = document.getElementById('edit-upload-label');
        uploadLabel.innerText = "Uploading...";
        
        let paths = [];
        for (let i = 0; i < files.length; i++) {
            this.showToast(`Uploading ${i+1}/${files.length}...`);
            try {
                let path = await this.compressAndUpload(files[i], category);
                paths.push(path);
            } catch(e) { alert('Upload failed: ' + e); }
        }
        
        if (!this.data.products[category][index].more_images) {
            this.data.products[category][index].more_images = [];
        }
        this.data.products[category][index].more_images.push(...paths);
        
        this.showToast('Extra images uploaded!');
        document.getElementById('admin-edit-modal').remove();
        this.openEditModal(category, index);
    },

    saveEditModal(category, index) {
        const prod = this.data.products[category][index];
        prod.name = document.getElementById('edit-name').value;
        const priceRaw = document.getElementById('edit-price').value;
        const pNum = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));
        prod.price = isNaN(pNum) ? priceRaw : '₹' + pNum;
        
        prod.stock = parseInt(document.getElementById('edit-stock').value) || 0;
        prod.discount = parseInt(document.getElementById('edit-discount').value) || 0;
        prod.badge = document.getElementById('edit-badge').value;
        prod.description = document.getElementById('edit-desc').value;
        
        this.showToast('Product updated in memory! Commit to save.');
        document.getElementById('admin-edit-modal').remove();
        this.renderProducts();
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

    async deleteFileFromGitHub(path) {
        if (!path || path.startsWith('http')) return;
        
        let inUse = false;
        if (this.data.site_config) {
            Object.values(this.data.site_config).forEach(val => {
                if (val === path) inUse = true;
            });
        }
        if (this.data.products) {
            Object.values(this.data.products).forEach(categoryArr => {
                categoryArr.forEach(prod => {
                    if (prod.image === path) inUse = true;
                    if (prod.more_images && prod.more_images.includes(path)) inUse = true;
                });
            });
        }
        
        if (inUse) {
            console.log('Skipping GitHub deletion, image still in use by another product or config:', path);
            return;
        }

        try {
            const getRes = await fetch(`https://api.github.com/repos/${this.auth.username}/${this.auth.repo}/contents/${path}`, {
                headers: { 'Authorization': `token ${this.auth.token}` }
            });
            if (!getRes.ok) return;
            const fileData = await getRes.json();
            await fetch(`https://api.github.com/repos/${this.auth.username}/${this.auth.repo}/contents/${path}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${this.auth.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Deleted image ${path}`, sha: fileData.sha })
            });
            console.log('Deleted ghost image:', path);
        } catch(e) { console.error('Clean failure:', e); }
    },

    removeProduct(category, index) {
        if (confirm('Delete product? This also permanently deletes its images from GitHub if they are not used elsewhere.')) {
            const prod = this.data.products[category][index];
            const imagesToCheck = [];
            if (prod.image) imagesToCheck.push(prod.image);
            if (prod.more_images) imagesToCheck.push(...prod.more_images);
            
            this.data.products[category].splice(index, 1);
            imagesToCheck.forEach(img => this.deleteFileFromGitHub(img));
            
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