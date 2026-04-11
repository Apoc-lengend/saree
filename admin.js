const app = {
    auth: { username: '', repo: '', token: '' },
    data: null,
    fileSha: '',
    currentPage: 1,
    pageSize: 20,
    selectedIndices: new Set(),
    activeStatusTab: 'all',
    hasUnsavedChanges: false,
    originalDataText: null,

    markChanged() {
        this.hasUnsavedChanges = true;
    },

    async _ghFetch(path, options = {}) {
        const url = new URL(`https://api.github.com/repos/${this.auth.username}/${this.auth.repo}/contents/${path}`);
        if (options.bust) {
            url.searchParams.append('timestamp', Date.now());
            options.cache = 'no-store';
            delete options.bust;
        }
        if (!options.headers) options.headers = {};
        options.headers['Authorization'] = `token ${this.auth.token}`;
        if (options.method && options.method !== 'GET') {
            options.headers['Content-Type'] = 'application/json';
        }
        return fetch(url.toString(), options);
    },

    async _ghAPI(endpoint, method = 'GET', body = null) {
        let urlPath = endpoint ? `/${endpoint}` : '';
        const url = `https://api.github.com/repos/${this.auth.username}/${this.auth.repo}${urlPath}`;
        const options = {
            method,
            headers: {
                'Authorization': `token ${this.auth.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`GitHub API Error: ${res.statusText}`);
        return res.json();
    },

    showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 3000);
    },

    async login() {
        this.auth.username = document.getElementById('github-username').value.trim();
        this.auth.repo = document.getElementById('github-repo').value.trim();
        this.auth.token = document.getElementById('github-token').value.trim();

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

            // Handle Base64 decode safely (handles UTF-8 / Hindi characters)
            let jsonText = decodeURIComponent(escape(window.atob(fileData.content.replace(/\s/g, ''))));

            // Clean up invisible characters or BOMs around the JSON payload
            const startIdx = jsonText.indexOf('{');
            if (startIdx > 0) jsonText = jsonText.substring(startIdx);
            const endIdx = jsonText.lastIndexOf('}');
            if (endIdx !== -1) jsonText = jsonText.substring(0, endIdx + 1);

            this.data = JSON.parse(jsonText);
            this.originalDataText = JSON.stringify(this.data);
            this.hasUnsavedChanges = false;

            // Ensure product arrays exist
            this.data.products = this.data.products || {};
            this.data.products.sarees = this.data.products.sarees || [];
            this.data.products.bedsheets = this.data.products.bedsheets || [];

            // Switch UI
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('dashboard-screen').style.display = 'block';
            document.getElementById('repo-display').innerText = `${this.auth.username}/${this.auth.repo}`;

            this.populateConfig();
            this.resetAndRender(); // calls renderProducts → updateMetrics internally
            this.showToast('Successfully connected!');

            // Escape key closes any open modal
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    ['admin-edit-modal', 'admin-pref-modal'].forEach(id => {
                        const m = document.getElementById(id);
                        if (m) m.remove();
                    });
                }
            });

        } catch (err) {
            alert(err.message);
        }
    },

    // ─── METRICS DASHBOARD ────────────────────────────────────────────────────

    updateMetrics() {
        if (!this.data) return;
        const sarees = this.data.products.sarees || [];
        const beds = this.data.products.bedsheets || [];
        const all = [...sarees, ...beds];

        const totalSarees = sarees.length;
        const totalBeds = beds.length;
        const outOfStock = all.filter(p => (p.stock || 0) <= 0).length;
        const onSale = all.filter(p => (p.discount || 0) > 0).length;
        const hidden = all.filter(p => p.status === 'hidden').length;
        const archived = all.filter(p => p.status === 'archived').length;
        const live = all.filter(p => !p.status || p.status === 'live').length;

        const container = document.getElementById('metric-dashboard');
        if (!container) return;

        const card = (label, value, color) => `
            <div style="padding:15px 20px; background:white; border-radius:8px;
                        box-shadow:0 2px 8px rgba(0,0,0,0.07); border-top:3px solid ${color};">
                <div style="font-size:0.7rem; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">${label}</div>
                <div style="font-size:1.6rem; font-weight:900; color:${color};">${value}</div>
            </div>`;

        container.innerHTML =
            card('📦 Total Products', all.length, '#7B1338') +
            card('🧣 Sarees', totalSarees, '#B08D57') +
            card('🛏 Bedsheets', totalBeds, '#4a5568') +
            card('🟢 Live', live, '#38a169') +
            card('⚠️ Out of Stock', outOfStock, '#e53e3e') +
            card('🔥 On Sale', onSale, '#dd6b20') +
            card('🟡 Hidden', hidden, '#d69e2e') +
            card('🔴 Archived', archived, '#9b2c2c');
    },

    // ─── SITE CONFIG ──────────────────────────────────────────────────────────

    populateConfig() {
        const c = this.data.site_config || {};
        document.getElementById('cfg-hero-label').innerHTML = '📁 Hero Cover<br><small style="font-weight:normal;color:#7B1338;">' + (c.hero_cover || 'Not set') + '</small>';
        document.getElementById('cfg-sarees-label').innerHTML = '📁 Saree Cover<br><small style="font-weight:normal;color:#7B1338;">' + (c.sarees_cover || 'Not set') + '</small>';
        document.getElementById('cfg-bed-label').innerHTML = '📁 Bedsheet Cover<br><small style="font-weight:normal;color:#7B1338;">' + (c.bedsheets_cover || 'Not set') + '</small>';

        document.getElementById('cfg-delivery-value').value = c.delivery_value || 'Free Delivery';
        document.getElementById('cfg-whatsapp').value = c.whatsapp_number || '919876543210';

        document.getElementById('cfg-hero-title').value = c.hero_title || '';
        document.getElementById('cfg-hero-subtitle').value = c.hero_subtitle || '';
        document.getElementById('cfg-sarees-title').value = c.sarees_title || '';
        document.getElementById('cfg-sarees-subtitle').value = c.sarees_subtitle || '';
        document.getElementById('cfg-bedsheets-title').value = c.bedsheets_title || '';
        document.getElementById('cfg-bedsheets-subtitle').value = c.bedsheets_subtitle || '';
    },

    updateConfig(key, value) {
        if (!this.data.site_config) this.data.site_config = {};
        this.data.site_config[key] = value;
        this.markChanged();
    },

    async uploadConfigImage(key, file, labelId) {
        if (!file) return;
        const label = document.getElementById(labelId);
        label.innerText = 'Uploading...';
        this.showToast('Pushing to GitHub...');
        try {
            const path = await this.compressAndUpload(file, 'banners');
            this.updateConfig(key, path);
            this.showToast('Banner saved in memory! Commit to publish.');
            this.populateConfig();
        } catch (e) {
            alert('Upload failed: ' + e);
            label.innerText = 'Upload Failed – Try Again';
        }
    },

    // ─── PRODUCT LIST / PAGINATION ────────────────────────────────────────────

    resetAndRender() {
        this.currentPage = 1;
        this.selectedIndices.clear();
        this.activeStatusTab = 'all';
        this._syncBulkSelectAll();
        this._updateTabUI();
        this.renderProducts();
    },

    loadMoreProducts() {
        this.currentPage++;
        this.renderProducts();
    },

    setStatusTab(tab) {
        this.activeStatusTab = tab;
        this.currentPage = 1;
        this.selectedIndices.clear();
        this._syncBulkSelectAll();
        this._updateTabUI();
        this.renderProducts();
    },

    _updateTabUI() {
        const category = document.getElementById('manage-category').value;
        const all = this.data.products[category] || [];
        const counts = { all: all.length, live: 0, hidden: 0, archived: 0 };
        all.forEach(p => {
            const s = p.status || 'live';
            if (counts[s] !== undefined) counts[s]++;
        });

        const activeColors = { all: '#7B1338', live: '#276749', hidden: '#975a16', archived: '#742a2a' };
        const activeText = { all: 'white', live: 'white', hidden: 'white', archived: 'white' };

        ['all', 'live', 'hidden', 'archived'].forEach(tab => {
            const btn = document.querySelector(`#status-tabs [data-tab="${tab}"]`);
            const countEl = document.getElementById(`tab-count-${tab}`);
            if (!btn) return;
            const isActive = this.activeStatusTab === tab;
            btn.style.background = isActive ? activeColors[tab] : '#f0f0f0';
            btn.style.color = isActive ? activeText[tab] : '#555';
            btn.style.fontWeight = isActive ? '700' : '600';
            if (countEl) countEl.textContent = `(${counts[tab]})`;
        });
    },

    renderProducts() {
        const category = document.getElementById('manage-category').value;
        const list = document.getElementById('product-list');
        const loadMoreBtn = document.getElementById('load-more-btn');
        list.innerHTML = '';

        // Update tab counts regardless
        this._updateTabUI();

        const all = this.data.products[category] || [];

        const query = (document.getElementById('manage-search') ? document.getElementById('manage-search').value : '').toLowerCase();
        const sortValue = document.getElementById('manage-sort') ? document.getElementById('manage-sort').value : 'default';

        // Filter by active status tab
        let filtered = this.activeStatusTab === 'all'
            ? all
            : all.filter(p => (p.status || 'live') === this.activeStatusTab);

        if (query) {
            filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(query));
        }

        // Map filtered indices back to their REAL indices in the full array
        // so edits/deletes use the correct position in data.products[category]
        let indexedFiltered = filtered.map(p => ({ prod: p, realIndex: all.indexOf(p) }));
        
        if (sortValue === 'newest') {
            indexedFiltered.sort((a, b) => new Date(b.prod.dateAdded || 0) - new Date(a.prod.dateAdded || 0));
        } else if (sortValue === 'oldest') {
            indexedFiltered.sort((a, b) => new Date(a.prod.dateAdded || 0) - new Date(b.prod.dateAdded || 0));
        }

        const visibleSlice = indexedFiltered.slice(0, this.currentPage * this.pageSize);

        if (filtered.length === 0) {
            const tabLabel = this.activeStatusTab === 'all' ? '' : ` with status "${this.activeStatusTab}"`;
            list.innerHTML = `<p style="color:#aaa;text-align:center;padding:30px 20px;font-size:0.9rem;">No products${tabLabel} in this category yet.</p>`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            this.updateMetrics();
            return;
        }

        visibleSlice.forEach(({ prod, realIndex: index }) => {
            const item = document.createElement('div');
            item.className = 'product-item';
            item.style.alignItems = 'flex-start';
            item.style.cursor = 'pointer';

            const status = prod.status || 'live';
            const statusDot = { live: '#38a169', hidden: '#d69e2e', archived: '#e53e3e' }[status] || '#38a169';
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
            const isChecked = this.selectedIndices.has(index);
            const extraThumbs = (prod.more_images || []).map(img =>
                `<img src="${img}" style="width:28px;height:28px;border-radius:3px;object-fit:cover;border:1px solid #ccc;">`
            ).join('');

            item.innerHTML = `
                <label style="display:flex;align-items:center;padding:10px 6px;cursor:pointer;" onclick="event.stopPropagation()">
                    <input type="checkbox" data-index="${index}" ${isChecked ? 'checked' : ''}
                        onchange="app.onCheckboxChange(${index}, this.checked)"
                        style="width:16px;height:16px;cursor:pointer;">
                </label>
                <div style="position:relative;margin-top:8px;margin-right:12px;flex-shrink:0;">
                    <img src="${prod.image}" onerror="this.src='https://via.placeholder.com/50'"
                        style="width:52px;height:52px;object-fit:cover;border-radius:5px;">
                    <span style="position:absolute;bottom:-3px;right:-3px;width:11px;height:11px;
                        border-radius:50%;background:${statusDot};border:2px solid white;"
                        title="Status: ${statusLabel}"></span>
                </div>
                <div style="flex:1;min-width:0;pointer-events:none;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <strong style="color:#7B1338;font-size:0.9rem;">${prod.name}</strong>
                        <span style="font-size:0.65rem;background:${statusDot};color:white;padding:1px 6px;border-radius:10px;">${statusLabel}</span>
                        ${prod.badge ? `<span style="font-size:0.65rem;background:#7B1338;color:white;padding:1px 6px;border-radius:10px;">${prod.badge}</span>` : ''}
                    </div>
                    <small style="color:#666;display:block;margin-top:2px;">${prod.price} &nbsp;|&nbsp; Stock: ${prod.stock} &nbsp;|&nbsp; Discount: ${prod.discount}%</small>
                    <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;">${extraThumbs}</div>
                </div>
                <button class="btn-red" onclick="event.stopPropagation(); app.removeProduct('${category}', ${index})"
                    style="margin-left:8px;margin-top:8px;padding:5px 10px;font-size:0.8rem;flex-shrink:0;">Delete</button>
            `;

            // Click row (not checkbox/button) → open edit
            item.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
                this.openEditModal(category, index);
            });

            list.appendChild(item);
        });

        if (loadMoreBtn) {
            loadMoreBtn.style.display = visibleSlice.length < indexedFiltered.length ? 'block' : 'none';
        }
        this.updateMetrics();
    },

    // ─── BULK OPERATIONS ─────────────────────────────────────────────────────

    onCheckboxChange(index, checked) {
        if (checked) this.selectedIndices.add(index);
        else this.selectedIndices.delete(index);
        this._syncBulkSelectAll();
    },

    _syncBulkSelectAll() {
        const el = document.getElementById('bulk-select-all');
        if (!el) return;
        const category = document.getElementById('manage-category').value;
        const total = (this.data.products[category] || []).length;
        el.checked = this.selectedIndices.size > 0 && this.selectedIndices.size >= total;
        el.indeterminate = this.selectedIndices.size > 0 && this.selectedIndices.size < total;
    },

    toggleBulkSelectAll(checked) {
        const category = document.getElementById('manage-category').value;
        const total = (this.data.products[category] || []).length;
        this.selectedIndices.clear();
        if (checked) {
            for (let i = 0; i < total; i++) this.selectedIndices.add(i);
        }
        this.renderProducts();
    },

    async executeBulkAction() {
        const action = document.getElementById('bulk-action').value;
        if (!action) { alert('Please choose a bulk action from the dropdown.'); return; }
        if (this.selectedIndices.size === 0) { alert('No products selected. Use the checkboxes to select items first.'); return; }

        const category = document.getElementById('manage-category').value;
        const products = this.data.products[category];
        // Sort descending so splice doesn't shift remaining indices
        const indices = [...this.selectedIndices].sort((a, b) => b - a);
        const count = indices.length;

        if (action === 'delete') {
            if (!confirm(`Permanently delete ${count} product(s)? Their images will also be removed from GitHub.`)) return;
            for (const idx of indices) {
                const p = products[idx];
                [p.image, ...(p.more_images || [])].forEach(img => this.deleteFileFromGitHub(img));
                products.splice(idx, 1);
            }
            this.showToast(`Deleted ${count} product(s). Commit to publish.`);

        } else if (action === 'set_live') {
            indices.forEach(idx => products[idx].status = 'live');
            this.showToast(`Set ${count} product(s) to Live.`);

        } else if (action === 'set_hidden') {
            indices.forEach(idx => products[idx].status = 'hidden');
            this.showToast(`Set ${count} product(s) to Hidden.`);

        } else if (action === 'set_archived') {
            indices.forEach(idx => products[idx].status = 'archived');
            this.showToast(`Set ${count} product(s) to Archived.`);

        } else if (action === 'discount_10') {
            indices.forEach(idx => products[idx].discount = 10);
            this.showToast(`Applied 10% discount to ${count} product(s).`);

        } else if (action === 'discount_20') {
            indices.forEach(idx => products[idx].discount = 20);
            this.showToast(`Applied 20% discount to ${count} product(s).`);

        } else if (action === 'discount_25') {
            indices.forEach(idx => products[idx].discount = 25);
            this.showToast(`Applied 25% discount to ${count} product(s).`);

        } else if (action === 'discount_50') {
            indices.forEach(idx => products[idx].discount = 50);
            this.showToast(`Applied 50% discount to ${count} product(s).`);

        } else if (action === 'remove_discount') {
            indices.forEach(idx => products[idx].discount = 0);
            this.showToast(`Removed discounts from ${count} product(s).`);

        } else if (action === 'set_badge_new') {
            indices.forEach(idx => products[idx].badge = 'new');
            this.showToast(`Set 'New' badge on ${count} product(s).`);

        } else if (action === 'set_badge_sale') {
            indices.forEach(idx => products[idx].badge = 'sale');
            this.showToast(`Set 'Sale' badge on ${count} product(s).`);

        } else if (action === 'set_badge_trending') {
            indices.forEach(idx => products[idx].badge = 'trending');
            this.showToast(`Set 'Trending' badge on ${count} product(s).`);

        } else if (action === 'remove_badge') {
            indices.forEach(idx => products[idx].badge = '');
            this.showToast(`Removed badge from ${count} product(s).`);

        } else if (action === 'set_stock_zero') {
            indices.forEach(idx => products[idx].stock = 0);
            this.showToast(`Set stock to 0 (Out of Stock) for ${count} product(s).`);
        }

        this.selectedIndices.clear();
        document.getElementById('bulk-select-all').checked = false;
        document.getElementById('bulk-action').value = '';
        this.markChanged();
        this.renderProducts();
    },

    // ─── PREFERENCE REORDER MODAL ─────────────────────────────────────────────

    openPreferencesModal() {
        const category = document.getElementById('manage-category').value;
        const old = document.getElementById('admin-pref-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'admin-pref-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.82);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

        let gridHTML = '';
        (this.data.products[category] || []).forEach((prod, index) => {
            gridHTML += `
                <div draggable="true" data-index="${index}"
                     ondragstart="event.dataTransfer.setData('sourceIndex','${index}'); setTimeout(()=>this.style.opacity='0.4',0);"
                     ondragend="this.style.opacity='1';"
                     ondragover="event.preventDefault(); this.style.outline='2px solid #7B1338';"
                     ondragleave="this.style.outline='';"
                     ondrop="this.style.outline=''; app.handleReorderDrop(event,'${category}',${index});"
                     style="width:72px;height:72px;border-radius:6px;overflow:hidden;border:2px solid #ddd;
                            cursor:grab;position:relative;flex-shrink:0;transition:transform 0.1s;">
                    <img src="${prod.image}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;">
                    <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.65);
                                color:white;font-size:9px;padding:2px 0;text-align:center;">#${index + 1}</div>
                </div>`;
        });

        modal.innerHTML = `
            <div style="background:white;padding:25px;border-radius:10px;width:92%;max-width:640px;
                        max-height:88vh;overflow-y:auto;color:#333;position:relative;">
                <button onclick="document.getElementById('admin-pref-modal').remove()"
                    style="position:absolute;top:12px;right:16px;background:transparent;border:none;
                           font-size:1.6rem;cursor:pointer;color:#999;">&times;</button>
                <h2 style="margin-bottom:6px;color:#7B1338;">Reorder: ${category.charAt(0).toUpperCase() + category.slice(1)}</h2>
                <p style="font-size:0.82rem;color:#888;margin-bottom:18px;">
                    Drag and drop thumbnails to reorder how products appear on the website. Changes apply to live order after Commit.
                </p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;">${gridHTML}</div>
                <button onclick="document.getElementById('admin-pref-modal').remove()"
                    style="width:100%;padding:11px;background:#7B1338;color:white;border:none;
                           border-radius:5px;cursor:pointer;font-weight:bold;font-size:0.95rem;">Done</button>
            </div>`;
        document.body.appendChild(modal);
    },

    handleReorderDrop(e, category, targetIndex) {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'));
        if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

        const items = this.data.products[category];
        const [dragged] = items.splice(sourceIndex, 1);
        const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        items.splice(adjustedTarget, 0, dragged);

        this.markChanged();
        this.renderProducts();
        this.showToast('Reordered! Commit Changes to publish.');
        const old = document.getElementById('admin-pref-modal');
        if (old) old.remove();
        this.openPreferencesModal();
    },

    // ─── EDIT PRODUCT MODAL ───────────────────────────────────────────────────

    openEditModal(category, index) {
        const prod = this.data.products[category][index];
        const old = document.getElementById('admin-edit-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'admin-edit-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.82);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

        const curStatus = prod.status || 'live';
        const statusOpts = ['live', 'hidden', 'archived'];
        const statusRadios = statusOpts.map(s => {
            const colors = { live: '#38a169', hidden: '#d69e2e', archived: '#e53e3e' };
            const icons = { live: '🟢', hidden: '🟡', archived: '🔴' };
            const isChecked = curStatus === s ? 'checked' : '';
            return `<label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:6px;
                                  border:2px solid ${isChecked ? colors[s] : '#ddd'};cursor:pointer;
                                  background:${isChecked ? colors[s] + '18' : 'white'};
                                  font-size:0.85rem;font-weight:600;transition:all 0.15s;"
                        id="edit-status-label-${s}">
                <input type="radio" name="edit-status" value="${s}" ${isChecked}
                    onchange="app._highlightStatusLabel('${s}')"
                    style="accent-color:${colors[s]};cursor:pointer;">
                ${icons[s]} ${s.charAt(0).toUpperCase() + s.slice(1)}
            </label>`;
        }).join('');

        let extraThumbsHTML = (prod.more_images || []).map((img, i) => `
            <div style="position:relative;display:inline-block;">
                <img src="${img}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">
                <button onclick="app.removeExtraImage('${category}',${index},${i})"
                    style="position:absolute;top:-6px;right:-6px;background:#e53e3e;color:white;border:none;
                           border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:11px;
                           display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>`).join('');

        modal.innerHTML = `
            <div style="background:white;padding:25px;border-radius:10px;width:95%;max-width:520px;
                        max-height:92vh;overflow-y:auto;color:#333;position:relative;" onclick="event.stopPropagation()">
                <button onclick="document.getElementById('admin-edit-modal').remove()"
                    style="position:absolute;top:12px;right:16px;background:transparent;border:none;
                           font-size:1.6rem;cursor:pointer;color:#999;">&times;</button>
                <h2 style="margin-bottom:16px;color:#7B1338;">Edit Product</h2>

                <div style="display:flex;gap:14px;margin-bottom:18px;">
                    <img src="${prod.image}" style="width:90px;height:90px;object-fit:cover;border-radius:7px;border:1px solid #eee;flex-shrink:0;">
                    <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
                        <input type="text" id="edit-name" value="${prod.name.replace(/"/g, '&quot;')}"
                            placeholder="Product Name" style="padding:9px;border:1px solid #ddd;width:100%;border-radius:5px;box-sizing:border-box;">
                        <input type="text" id="edit-price" value="${prod.price}"
                            placeholder="Price e.g. ₹1200" style="padding:9px;border:1px solid #ddd;width:100%;border-radius:5px;box-sizing:border-box;">
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                    <label style="font-size:0.82rem;font-weight:700;color:#555;">Stock
                        <input type="number" id="edit-stock" value="${prod.stock}"
                            style="width:100%;padding:9px;border:1px solid #ddd;border-radius:5px;margin-top:4px;box-sizing:border-box;">
                    </label>
                    <label style="font-size:0.82rem;font-weight:700;color:#555;">Discount (%)
                        <input type="number" id="edit-discount" value="${prod.discount}"
                            style="width:100%;padding:9px;border:1px solid #ddd;border-radius:5px;margin-top:4px;box-sizing:border-box;">
                    </label>
                </div>

                <label style="font-size:0.82rem;font-weight:700;color:#555;display:block;margin-bottom:12px;">Badge
                    <select id="edit-badge" style="width:100%;padding:9px;border:1px solid #ddd;border-radius:5px;margin-top:4px;">
                        <option value="" ${!prod.badge ? 'selected' : ''}>None</option>
                        <option value="new" ${prod.badge === 'new' ? 'selected' : ''}>🟢 New</option>
                        <option value="sale" ${prod.badge === 'sale' ? 'selected' : ''}>🔴 Sale</option>
                        <option value="trending" ${prod.badge === 'trending' ? 'selected' : ''}>🟣 Trending</option>
                    </select>
                </label>

                <label style="font-size:0.82rem;font-weight:700;color:#555;display:block;margin-bottom:14px;">Description
                    <textarea id="edit-desc" rows="3"
                        style="width:100%;padding:9px;border:1px solid #ddd;border-radius:5px;margin-top:4px;box-sizing:border-box;resize:vertical;">${prod.description || ''}</textarea>
                </label>

                <div style="margin-bottom:18px;">
                    <div style="font-size:0.82rem;font-weight:700;color:#555;margin-bottom:8px;">Visibility Status</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;" id="edit-status-wrapper">
                        ${statusRadios}
                    </div>
                </div>

                <div style="margin-bottom:20px;padding:12px;background:#f9f9f9;border-radius:7px;">
                    <h4 style="margin:0 0 10px;font-size:0.9rem;color:#555;">Additional Images</h4>
                    <div id="extra-thumbs-container" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                        ${extraThumbsHTML || '<span style="color:#bbb;font-size:0.8rem;">No extra images</span>'}
                    </div>
                    <label for="edit-upload-more" id="edit-upload-label"
                        style="display:inline-block;background:white;border:1px dashed #aaa;padding:7px 14px;
                               cursor:pointer;font-size:0.82rem;font-weight:700;border-radius:5px;">
                        + Upload More Photos
                    </label>
                    <input type="file" id="edit-upload-more" multiple accept="image/*" style="display:none;"
                        onchange="app.uploadExtraImagesForEdit('${category}',${index},this.files)">
                </div>

                <div style="display:flex;justify-content:space-between;gap:10px;">
                    <button onclick="document.getElementById('admin-edit-modal').remove()"
                        style="flex:1;padding:11px;background:#f5f5f5;border:1px solid #ddd;border-radius:5px;cursor:pointer;font-weight:700;">Cancel</button>
                    <button onclick="app.saveEditModal('${category}',${index})"
                        style="flex:2;padding:11px;background:#7B1338;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:700;">Save Changes</button>
                </div>
            </div>`;

        modal.onclick = () => modal.remove();
        document.body.appendChild(modal);
    },

    _highlightStatusLabel(selectedVal) {
        const colors = { live: '#38a169', hidden: '#d69e2e', archived: '#e53e3e' };
        ['live', 'hidden', 'archived'].forEach(s => {
            const lbl = document.getElementById(`edit-status-label-${s}`);
            if (!lbl) return;
            if (s === selectedVal) {
                lbl.style.borderColor = colors[s];
                lbl.style.background = colors[s] + '18';
            } else {
                lbl.style.borderColor = '#ddd';
                lbl.style.background = 'white';
            }
        });
    },

    removeExtraImage(category, index, imgIndex) {
        if (!confirm('Remove this extra image?')) return;
        const imgPath = this.data.products[category][index].more_images[imgIndex];
        this.data.products[category][index].more_images.splice(imgIndex, 1);
        if (imgPath) this.deleteFileFromGitHub(imgPath);
        this.markChanged();
        this.showToast('Removed extra image.');
        document.getElementById('admin-edit-modal').remove();
        this.openEditModal(category, index);
    },

    async uploadExtraImagesForEdit(category, index, files) {
        if (!files.length) return;
        document.getElementById('edit-upload-label').innerText = 'Uploading...';
        const paths = [];
        for (let i = 0; i < files.length; i++) {
            this.showToast(`Uploading ${i + 1}/${files.length}...`);
            try {
                paths.push(await this.compressAndUpload(files[i], category));
            } catch (e) { alert('Upload failed: ' + e); }
        }
        if (!this.data.products[category][index].more_images) {
            this.data.products[category][index].more_images = [];
        }
        this.data.products[category][index].more_images.push(...paths);
        this.markChanged();
        this.showToast('Extra images uploaded!');
        document.getElementById('admin-edit-modal').remove();
        this.openEditModal(category, index);
    },

    saveEditModal(category, index) {
        const prod = this.data.products[category][index];
        prod.name = document.getElementById('edit-name').value.trim();

        const priceRaw = document.getElementById('edit-price').value;
        const pNum = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));
        prod.price = isNaN(pNum) ? priceRaw : '₹' + pNum;

        prod.stock = parseInt(document.getElementById('edit-stock').value) || 0;
        prod.discount = parseInt(document.getElementById('edit-discount').value) || 0;
        prod.badge = document.getElementById('edit-badge').value;
        prod.description = document.getElementById('edit-desc').value;

        const statusEl = document.querySelector('input[name="edit-status"]:checked');
        if (statusEl) {
            prod.status = statusEl.value;
            if (prod.status === 'archived') {
                prod.stock = 0; // Force stock 0 for archived
            }
        }

        this.markChanged();
        this.showToast('Product updated! Commit to save.');
        document.getElementById('admin-edit-modal').remove();
        this.renderProducts();
    },

    // ─── ADD PRODUCT ─────────────────────────────────────────────────────────

    async addProduct() {
        const category = document.getElementById('add-category').value;
        const name = document.getElementById('add-name').value.trim();
        let price = document.getElementById('add-price').value.trim();
        const mainImageFile = document.getElementById('add-image').files[0];
        const moreImageFiles = document.getElementById('add-more-images').files;
        const stock = parseInt(document.getElementById('add-stock').value) || 0;
        const discount = parseInt(document.getElementById('add-discount').value) || 0;
        const badge = document.getElementById('add-badge').value;
        const description = document.getElementById('add-desc').value.trim();
        const statusEl = document.querySelector('input[name="add-status"]:checked');
        const status = statusEl ? statusEl.value : 'live';
        const dateAdded = new Date().toISOString();

        if (!name || !price || !mainImageFile) {
            alert('Please fill out Name, Price, and select a Front Image.');
            return;
        }

        const priceNum = parseFloat(price.replace(/[^0-9.]/g, ''));
        if (isNaN(priceNum)) { alert('Please enter a valid numerical price.'); return; }
        price = '₹' + priceNum;

        const btn = document.querySelector('button[onclick="app.addProduct()"]');
        if (btn) { btn.innerText = 'Uploading...'; btn.disabled = true; }

        try {
            this.showToast('Uploading main image...');
            const image = await this.compressAndUpload(mainImageFile, category);
            const more_images = [];
            for (let i = 0; i < moreImageFiles.length; i++) {
                this.showToast(`Uploading extra image ${i + 1}/${moreImageFiles.length}...`);
                more_images.push(await this.compressAndUpload(moreImageFiles[i], category));
            }

            const newId = 'p' + Date.now();
            let finalStock = stock;
            if (status === 'archived') finalStock = 0;

            this.data.products[category].push({ id: newId, name, price, image, style: '', stock: finalStock, discount, badge, description, status, more_images, dateAdded });
            this.markChanged();

            // Reset form fields
            ['add-name', 'add-price', 'add-desc'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('add-stock').value = '10';
            document.getElementById('add-discount').value = '0';
            document.getElementById('add-badge').value = '';
            document.getElementById('add-image').value = '';
            document.getElementById('add-more-images').value = '';
            document.getElementById('add-image-label').innerText = '📁 Upload Front Image';
            document.getElementById('add-more-label').innerText = '🖼️ Upload Extra Images';
            // Reset status back to Live
            const liveRadio = document.querySelector('input[name="add-status"][value="live"]');
            if (liveRadio) liveRadio.checked = true;

            if (document.getElementById('manage-category').value === category) this.renderProducts();
            this.showToast('Product added! Click "Commit Changes" to save to GitHub.');
        } catch (e) {
            alert('Error uploading files: ' + e);
        }

        if (btn) { btn.innerText = 'Add Product'; btn.disabled = false; }
    },

    // ─── IMAGE COMPRESSION & UPLOAD ───────────────────────────────────────────

    async compressAndUpload(file, category) {
        return new Promise((resolve, reject) => {
            // Category-aware limits
            const maxKB = category === 'banners' ? 250 : 150;
            const maxBytes = maxKB * 1024;
            const maxDim = category === 'banners' ? 1600 : 900;
            // Prefer WebP (50-60% smaller) if browser encodes it reliably
            const testCanvas = document.createElement('canvas');
            testCanvas.width = testCanvas.height = 1;
            const supportsWebP = testCanvas.toDataURL('image/webp').startsWith('data:image/webp');
            const format = supportsWebP ? 'image/webp' : 'image/jpeg';
            const ext = supportsWebP ? 'webp' : 'jpg';

            // Quality targets — fine steps, start high
            const qualities = [0.92, 0.88, 0.84, 0.80, 0.75, 0.70, 0.64, 0.58, 0.50, 0.42, 0.35, 0.28];

            const processFile = async (base64Data) => {
                const b64 = base64Data.split(',')[1];
                const baseName = file.name.replace(/\s+/g, '-').replace(/\.[^.]+$/, '');
                const safeName = `${Date.now()}_${baseName}.${ext}`;
                const path = `assets/${category}/${safeName}`;
                let sha = null;
                try {
                    const getRes = await fetch(`https://api.github.com/repos/${app.auth.username}/${app.auth.repo}/contents/${path}`, {
                        headers: { 'Authorization': `token ${app.auth.token}` }
                    });
                    if (getRes.ok) sha = (await getRes.json()).sha;
                } catch (e) { }

                const body = { message: `Upload ${baseName}`, content: b64 };
                if (sha) body.sha = sha;

                const putRes = await fetch(`https://api.github.com/repos/${app.auth.username}/${app.auth.repo}/contents/${path}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `token ${app.auth.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (!putRes.ok) reject('Failed to upload ' + file.name);
                else resolve(path);
            };

            // Laplacian unsharp-mask for crisp fabric textures after downscale
            const applySharpening = (ctx, w, h, amount = 0.25) => {
                try {
                    const imageData = ctx.getImageData(0, 0, w, h);
                    const d = imageData.data;
                    const src = new Uint8ClampedArray(d);
                    for (let y = 1; y < h - 1; y++) {
                        for (let x = 1; x < w - 1; x++) {
                            const i = (y * w + x) * 4;
                            for (let c = 0; c < 3; c++) {
                                const lap = src[((y - 1) * w + x) * 4 + c] + src[((y + 1) * w + x) * 4 + c] +
                                    src[(y * w + x - 1) * 4 + c] + src[(y * w + x + 1) * 4 + c] - 4 * src[i + c];
                                d[i + c] = Math.min(255, Math.max(0, src[i + c] - amount * lap));
                            }
                        }
                    }
                    ctx.putImageData(imageData, 0, 0);
                } catch (e) { } // Non-fatal if cross-origin or policy blocks getImageData
            };

            const reader = new FileReader();
            reader.onload = async function (e) {
                // If already small enough and format is fine, just upload directly
                if (file.size <= maxBytes && (file.type === 'image/webp' || !supportsWebP)) {
                    processFile(e.target.result);
                    return;
                }

                const img = new Image();
                img.onload = async function () {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (w > maxDim || h > maxDim) {
                        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                        else { w = Math.round((w * maxDim) / h); h = maxDim; }
                    }
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);

                    // Apply subtle sharpening to recover texture lost in downscale
                    applySharpening(ctx, w, h, 0.22);

                    // Pick lowest quality that stays under budget
                    let out = canvas.toDataURL(format, qualities[0]);
                    for (const q of qualities) {
                        out = canvas.toDataURL(format, q);
                        await new Promise(r => setTimeout(r, 0)); // yield to UI thread
                        if (out.length * 0.75 <= maxBytes) break;
                    }
                    processFile(out);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    // ─── DELETE FILE ─────────────────────────────────────────────────────────

    async deleteFileFromGitHub(path) {
        if (!path || path.startsWith('http') || path.startsWith('//')) return;

        // Safety check: don't delete if still referenced anywhere
        let inUse = false;
        const conf = this.data.site_config || {};
        if (Object.values(conf).includes(path)) inUse = true;
        if (!inUse && this.data.products) {
            for (const arr of Object.values(this.data.products)) {
                for (const prod of arr) {
                    if (prod.image === path) { inUse = true; break; }
                    if (prod.more_images && prod.more_images.includes(path)) { inUse = true; break; }
                }
                if (inUse) break;
            }
        }
        if (inUse) return;

        try {
            const getRes = await fetch(`https://api.github.com/repos/${this.auth.username}/${this.auth.repo}/contents/${path}`, {
                headers: { 'Authorization': `token ${this.auth.token}` }
            });
            if (!getRes.ok) return;
            const fileMeta = await getRes.json();
            await fetch(`https://api.github.com/repos/${this.auth.username}/${this.auth.repo}/contents/${path}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${this.auth.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Deleted unused asset: ${path}`, sha: fileMeta.sha })
            });
            console.log('Deleted ghost asset:', path);
        } catch (e) { console.warn('Asset deletion skipped:', e); }
    },

    // ─── REMOVE SINGLE PRODUCT ───────────────────────────────────────────────

    removeProduct(category, index) {
        if (!confirm('Delete this product? Its images will be permanently removed from GitHub if not used elsewhere.')) return;
        const prod = this.data.products[category][index];
        [prod.image, ...(prod.more_images || [])].forEach(img => this.deleteFileFromGitHub(img));
        this.data.products[category].splice(index, 1);
        this.selectedIndices.delete(index);
        this.markChanged();
        this.renderProducts();
        this.showToast('Product removed! Commit to finalize.');
    },

    // ─── COMMIT TO GITHUB ─────────────────────────────────────────────────────

    _generateDiffHTML() {
        let oldData = {};
        try { oldData = JSON.parse(this.originalDataText || "{}"); } catch(e){}
        let html = '';
        let hasChanges = false;

        const oldCfg = oldData.site_config || {};
        const newCfg = this.data.site_config || {};
        const cfgChanges = [];
        for (let k in newCfg) { 
            if (newCfg[k] !== oldCfg[k]) {
                const readableKey = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                cfgChanges.push(`<li><b>${readableKey}</b> updated</li>`);
            } 
        }
        if (cfgChanges.length > 0) {
            html += `
                <div style="margin-bottom:12px;">
                    <span style="color:#276749;font-weight:bold;font-size:1.05rem;">⚙️ Site Settings</span>
                    <ul style="margin:4px 0 0 24px;color:#555;font-size:0.85rem;line-height:1.4;">
                        ${cfgChanges.join('')}
                    </ul>
                </div>`;
            hasChanges = true;
        }

        const categories = Object.keys(this.data.products || {});
        for (const cat of categories) {
            const oldList = oldData.products?.[cat] || [];
            const newList = this.data.products?.[cat] || [];
            
            const oldMap = new Map(oldList.filter(p=>p).map((p, i) => [p.id, { p, index: i }]));
            const newMap = new Map(newList.filter(p=>p).map((p, i) => [p.id, { p, index: i }]));
            
            const addedNames = [];
            const removedNames = [];
            const editedNames = [];
            const reorderedNames = [];
            
            for (const [newId, newVal] of newMap.entries()) {
                if (!oldMap.has(newId)) {
                    addedNames.push(newVal.p.name);
                } else {
                    const oldVal = oldMap.get(newId);
                    const isEdited = JSON.stringify(oldVal.p) !== JSON.stringify(newVal.p);
                    const isReordered = oldVal.index !== newVal.index;
                    
                    if (isEdited) editedNames.push(newVal.p.name);
                    else if (isReordered) reorderedNames.push(newVal.p.name);
                }
            }
            
            for (const [oldId, oldVal] of oldMap.entries()) {
                if (!newMap.has(oldId)) {
                    removedNames.push(oldVal.p.name);
                }
            }
            
            if (addedNames.length > 0 || removedNames.length > 0 || editedNames.length > 0 || reorderedNames.length > 0) {
                hasChanges = true;
                const badges = [];
                if (addedNames.length > 0) badges.push(`<span style="color:#276749;background:#e6fffa;padding:3px 8px;border-radius:12px;font-size:0.8rem;font-weight:600;">+${addedNames.length} Added</span>`);
                if (removedNames.length > 0) badges.push(`<span style="color:#c53030;background:#fff5f5;padding:3px 8px;border-radius:12px;font-size:0.8rem;font-weight:600;">-${removedNames.length} Removed</span>`);
                if (editedNames.length > 0) badges.push(`<span style="color:#d69e2e;background:#fffff0;border:1px solid #fefcbf;padding:2px 8px;border-radius:12px;font-size:0.8rem;font-weight:600;">✎ ${editedNames.length} Edited</span>`);
                if (reorderedNames.length > 0) badges.push(`<span style="color:#2b6cb0;background:#ebf8ff;border:1px solid #bee3f8;padding:2px 8px;border-radius:12px;font-size:0.8rem;font-weight:600;">⇅ ${reorderedNames.length} Reordered</span>`);
                
                const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
                html += `<div style="margin-bottom:12px;">
                            <div style="display:flex;align-items:center;margin-bottom:6px;gap:8px;">
                                <span style="font-weight:bold;color:#444;font-size:1.05rem;">📦 ${catName}</span>
                                ${badges.join(' ')}
                            </div>
                            <ul style="margin:0 0 0 24px;color:#555;font-size:0.85rem;line-height:1.4;">`;
                            
                const truncateObj = (arr, prefix) => {
                    if (arr.length === 0) return '';
                    if (arr.length <= 3) return `<li style="margin-bottom:2px;"><span style="display:inline-block;width:75px;font-weight:600;color:#7B1338;">${prefix}:</span> ${arr.join(', ')}</li>`;
                    return `<li style="margin-bottom:2px;"><span style="display:inline-block;width:75px;font-weight:600;color:#7B1338;">${prefix}:</span> ${arr.slice(0,3).join(', ')} ... <i>and ${arr.length - 3} more</i></li>`;
                };
                
                html += truncateObj(addedNames, 'Added');
                html += truncateObj(editedNames, 'Edited');
                html += truncateObj(reorderedNames, 'Reordered');
                html += truncateObj(removedNames, 'Removed');
                
                html += `</ul></div>`;
            }
        }
        
        if (!hasChanges) return `<div style="color:#777;font-style:italic;">No changes detected since last commit.</div>`;
        return html;
    },

    async _confirmCommit() {
        return new Promise(resolve => {
            const old = document.getElementById('commit-confirm-modal');
            if (old) old.remove();

            const diffHTML = this._generateDiffHTML();
            const modal = document.createElement('div');
            modal.id = 'commit-confirm-modal';
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);animation:fadeIn 0.2s ease-out;';
            modal.innerHTML = `
                <div style="background:white;padding:30px;border-radius:16px;width:90%;max-width:440px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);transform:scale(0.95);animation:scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;" onclick="event.stopPropagation()">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;border-bottom:2px solid #f0f0f0;padding-bottom:15px;">
                        <h2 style="margin:0;color:#7B1338;font-family:'Playfair Display',serif;font-size:1.6rem;">Publish Changes</h2>
                    </div>
                    <p style="color:#555;font-size:0.95rem;margin-bottom:15px;line-height:1.5;">You are about to push the current site updates to the live server. Please review your modifications below:</p>
                    <div style="background:#fafafa;border:1px solid #e8e8e8;border-radius:10px;padding:15px;margin-bottom:25px;min-height:60px;">
                        ${diffHTML}
                    </div>
                    <div style="display:flex;gap:12px;">
                        <button id="commit-cancel" style="flex:1;padding:12px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;cursor:pointer;font-weight:600;color:#555;font-size:1rem;transition:all 0.2s;">Cancel</button>
                        <button id="commit-confirm" style="flex:1;padding:12px;background:#7B1338;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:1rem;box-shadow:0 4px 12px rgba(123,19,56,0.25);transition:all 0.2s;">Yes, Publish Now</button>
                    </div>
                </div>
                <style>
                    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                    @keyframes scaleUp { from { transform:scale(0.95);opacity:0; } to { transform:scale(1);opacity:1; } }
                    #commit-cancel:hover { background:#e8e8e8; }
                    #commit-confirm:hover { background:#5a0d28; transform:translateY(-2px); box-shadow:0 6px 16px rgba(123,19,56,0.35); }
                </style>
            `;
            
            modal.onclick = () => { modal.remove(); resolve(false); };
            document.body.appendChild(modal);

            document.getElementById('commit-cancel').onclick = () => { modal.remove(); resolve(false); };
            document.getElementById('commit-confirm').onclick = () => {
                const btn = document.getElementById('commit-confirm');
                btn.innerHTML = 'Publishing...';
                btn.style.opacity = '0.8';
                btn.style.pointerEvents = 'none';
                document.getElementById('commit-cancel').style.pointerEvents = 'none';
                resolve({ proceed: true, modal: modal });
            };
        });
    },

    async saveChanges() {
        const confirmResult = await this._confirmCommit();
        if (!confirmResult || !confirmResult.proceed) return;

        try {
            // 1. Get repository info to find default branch
            const repoInfo = await this._ghAPI('');
            const branch = repoInfo.default_branch || 'main';

            // 2. Get latest commit SHA
            const refData = await this._ghAPI(`git/refs/heads/${branch}`);
            const commitSha = refData.object.sha;

            // 3. Get base tree SHA
            const commitData = await this._ghAPI(`git/commits/${commitSha}`);
            const baseTreeSha = commitData.tree.sha;

            // 4. Build new tree items
            const jsonText = JSON.stringify(this.data, null, 2);
            const tree = [{
                path: 'data.json',
                mode: '100644',
                type: 'blob',
                content: jsonText
            }];

            function escapeHTML(str) {
                if (!str) return '';
                return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
            }
            const siteUrl = `https://${this.auth.username}.github.io/${this.auth.repo}`;

            for (const cat in this.data.products) {
                const arr = this.data.products[cat] || [];
                for (const p of arr) {
                    if (!p || p.status !== 'live') continue;
                    const cleanName = escapeHTML(p.name);
                    const cleanDesc = escapeHTML(p.description || cleanName);
                    // Pure static HTML template optimized exactly for WhatsApp link unfurling
                    const html = `<!DOCTYPE html><html><head>
                        <meta charset="utf-8">
                        <title>${cleanName} - Parinay Saree</title>
                        <meta property="og:title" content="${cleanName}">
                        <meta property="og:description" content="${cleanDesc}">
                        <meta property="og:image" content="${siteUrl}/${p.image}">
                        <meta property="og:url" content="${siteUrl}/p/${p.id}.html">
                        <meta property="og:type" content="product">
                        <meta name="twitter:card" content="summary_large_image">
                        <script>window.location.replace("../${cat}.html#${p.id}");</script>
                    </head><body><p>Redirecting to product...</p></body></html>`;
                    tree.push({ path: `p/${p.id}.html`, mode: '100644', type: 'blob', content: html });
                }
            }

            // 5. Post the new tree to GitHub
            const treeData = await this._ghAPI('git/trees', 'POST', {
                base_tree: baseTreeSha,
                tree: tree
            });

            // 6. Create the commit
            const newCommit = await this._ghAPI('git/commits', 'POST', {
                message: 'Admin Dashboard: Updated catalog and generated SEO endpoints',
                tree: treeData.sha,
                parents: [commitSha]
            });

            // 7. Update the branch reference
            await this._ghAPI(`git/refs/heads/${branch}`, 'PATCH', {
                sha: newCommit.sha,
                force: false
            });

            this.originalDataText = JSON.stringify(this.data);
            this.hasUnsavedChanges = false;
            localStorage.removeItem('parinay_preview_data');
            
            confirmResult.modal.remove();
            this.showToast('✅ Live site updated! GitHub Pages will deploy in ~1 minute.');
        } catch (err) {
            confirmResult.modal.remove();
            alert('Commit failed: ' + err.message);
        }
    },

    // ─── PREVIEW CHANGES ─────────────────────────────────────────────────────
    // Saves in-memory data to localStorage so product pages can render it
    // before anything is committed to GitHub.

    previewChanges() {
        if (!this.data) { alert('No data loaded yet.'); return; }

        // Write current in-memory state to localStorage
        localStorage.setItem('parinay_preview_data', JSON.stringify(this.data));

        // Show a small picker modal — which page to open?
        const old = document.getElementById('admin-preview-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'admin-preview-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:white;padding:28px 32px;border-radius:10px;min-width:280px;text-align:center;" onclick="event.stopPropagation()">
                <h3 style="margin:0 0 6px;color:#7B1338;">Preview Uncommitted Changes</h3>
                <p style="font-size:0.82rem;color:#777;margin:0 0 20px;">Opens the selected page with your current in-memory edits.<br>Changes are <strong>not</strong> published yet.</p>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button onclick="window.open('sarees.html?preview=1','_blank'); document.getElementById('admin-preview-modal').remove();"
                        style="padding:11px;background:#7B1338;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.9rem;">
                        🧣 Preview Sarees Page
                    </button>
                    <button onclick="window.open('bedsheets.html?preview=1','_blank'); document.getElementById('admin-preview-modal').remove();"
                        style="padding:11px;background:#4a5568;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.9rem;">
                        🛏 Preview Bedsheets Page
                    </button>
                    <button onclick="window.open('index.html?preview=1','_blank'); document.getElementById('admin-preview-modal').remove();"
                        style="padding:11px;background:#276749;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.9rem;">
                        🏠 Preview Home Page
                    </button>
                    <button onclick="document.getElementById('admin-preview-modal').remove();"
                        style="padding:8px;background:#f0f0f0;color:#555;border:none;border-radius:6px;cursor:pointer;font-size:0.85rem;margin-top:4px;">
                        Cancel
                    </button>
                </div>
            </div>`;
        modal.onclick = () => modal.remove();
        document.body.appendChild(modal);
    },

    // ─── CLEANUP ORPHAN IMAGES ────────────────────────────────────────────────
    // Lists all files in asset folders on GitHub, finds ones not referenced
    // anywhere in data.json, then deletes them via deleteFileFromGitHub().

    async cleanupOrphanImages() {
        this.showToast('Scanning repository for orphan images…');

        // Build set of all referenced paths from current in-memory data
        const referenced = new Set();
        const cfg = this.data.site_config || {};
        Object.values(cfg).forEach(v => { if (typeof v === 'string' && v.startsWith('assets/')) referenced.add(v); });
        for (const arr of Object.values(this.data.products || {})) {
            for (const prod of arr) {
                if (prod.image) referenced.add(prod.image);
                (prod.more_images || []).forEach(img => { if (img) referenced.add(img); });
            }
        }

        // Fetch file listings from all asset subfolders
        const folders = ['assets/sarees', 'assets/bedsheets', 'assets/banners'];
        const orphans = [];

        for (const folder of folders) {
            try {
                const res = await this._ghFetch(folder);
                if (!res.ok) continue; // folder may not exist yet
                const files = await res.json();
                if (!Array.isArray(files)) continue;
                files.forEach(f => {
                    if (f.type === 'file' && !referenced.has(f.path)) orphans.push(f.path);
                });
            } catch (e) { /* folder doesn't exist, skip */ }
        }

        if (orphans.length === 0) {
            alert('✅ No orphan images found! Your repository is clean.');
            return;
        }

        const list = orphans.map(p => `  • ${p}`).join('\n');
        if (!confirm(`Found ${orphans.length} orphan image(s) not referenced by any product:\n\n${list}\n\nDelete all permanently from GitHub?`)) return;

        this.showToast(`Deleting ${orphans.length} orphan(s)…`);
        // Reuse existing deleteFileFromGitHub — it handles SHA fetch, DELETE, and the safety check
        for (const path of orphans) await this.deleteFileFromGitHub(path);
        this.showToast(`🧹 Done! Orphan cleanup complete.`);
    },

    // ─── EXPORT PRODUCT LIST AS PDF ───────────────────────────────────────────
    
    exportProductList() {
        if (!this.data) { alert('No data loaded yet.'); return; }
        const category = document.getElementById('manage-category').value;
        const all = this.data.products[category] || [];
        
        // Filter by active status tab
        const filtered = this.activeStatusTab === 'all' 
            ? all 
            : all.filter(p => (p.status || 'live') === this.activeStatusTab);

        if (filtered.length === 0) {
            alert('No products to export in this view.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Popup blocked! Please allow popups to export the PDF.');
            return;
        }
        
        // Derive live site base URL dynamically (works on GitHub Pages & custom domain)
        const adminPath = window.location.href;
        const baseUrl = adminPath.substring(0, adminPath.lastIndexOf('/') + 1);
        const categoryPage = category === 'sarees' ? 'sarees.html' : 'bedsheets.html';

        const d = new Date().toLocaleDateString('en-IN');
        const tabName = this.activeStatusTab.charAt(0).toUpperCase() + this.activeStatusTab.slice(1);
        const catName = category.charAt(0).toUpperCase() + category.slice(1);
        
        let html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <title>Product Catalog - ${catName} (${tabName})</title>
            <meta charset="UTF-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
                *, *::before, *::after { box-sizing: border-box; }
                body { font-family: 'Outfit', system-ui, -apple-system, sans-serif; color: #333; margin: 0; padding: 30px; background: #fff; }
                
                /* Header */
                .header-flex { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #7B1338; padding-bottom: 20px; margin-bottom: 28px; }
                .logo-text { font-size: 30px; font-weight: 700; color: #7B1338; margin: 0; letter-spacing: -0.5px; }
                .logo-sub { font-size: 16px; color: #666; margin-top: 6px; font-weight: 500; }
                .meta-text { font-size: 13px; color: #555; text-align: right; line-height: 1.8; background: #fdf8f2; padding: 10px 14px; border-radius: 8px; border: 1px solid #f0e4d4; }
                .meta-text strong { color: #7B1338; }

                /* Section title */
                .section-title { font-size: 15px; font-weight: 700; color: #7B1338; text-transform: uppercase; letter-spacing: 1px; margin: 28px 0 14px; padding-bottom: 8px; border-bottom: 1px solid #f0e4d4; }

                /* Table */
                table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 30px; }
                th, td { border: 1px solid #e8e8e8; padding: 10px 9px; text-align: left; vertical-align: middle; }
                th { background-color: #f9f5ef; font-weight: 700; color: #7B1338; text-transform: uppercase; font-size: 11px; letter-spacing: 0.6px; }
                tr:nth-child(even) td { background-color: #fafbfc; }
                tr:hover td { background: #fdf8f2; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }

                /* Product image in table */
                .product-thumb { width: 62px; height: 62px; object-fit: cover; border-radius: 6px; display: block; border: 1px solid #eee; background: #f5f5f5; }
                .product-name-cell { font-weight: 600; color: #222; }
                .product-name-cell .prod-id { font-size: 10px; color: #aaa; font-weight: 400; margin-top: 2px; }

                /* Status badges */
                .status-live    { color: #276749; font-weight: 700; }
                .status-hidden  { color: #975a16; font-weight: 700; }
                .status-archived{ color: #742a2a; font-weight: 700; }
                .badge-pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
                .badge-new      { background: #e0f2fe; color: #0369a1; }
                .badge-sale     { background: #fef3c7; color: #92400e; }
                .badge-trending { background: #fce7f3; color: #9d174d; }
                
                /* Links section */
                .links-section { margin-top: 10px; }
                .link-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-radius: 6px; margin-bottom: 6px; border: 1px solid #f0e8df; background: #fffaf6; }
                .link-row:nth-child(even) { background: #fff; }
                .link-num { font-size: 12px; font-weight: 700; color: #7B1338; min-width: 26px; padding-top: 2px; }
                .link-thumb { width: 44px; height: 44px; object-fit: cover; border-radius: 5px; border: 1px solid #eee; flex-shrink: 0; }
                .link-info { flex: 1; min-width: 0; }
                .link-name { font-weight: 600; font-size: 13px; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .link-url  { font-size: 11px; color: #7B1338; word-break: break-all; margin-top: 2px; text-decoration: none; }
                .link-url:hover { text-decoration: underline; }

                /* Footer */
                .footer-note { text-align: center; color: #bbb; font-size: 12px; margin-top: 36px; border-top: 1px solid #eaeaea; padding-top: 14px; }

                /* Print control button */
                .no-print { text-align: right; margin-bottom: 22px; }
                .no-print button { padding: 10px 22px; font-size: 14px; font-weight: 600; cursor: pointer; background: #7B1338; color: white; border: none; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.12); font-family: 'Outfit', sans-serif; transition: all 0.2s; }
                .no-print button:hover { background: #5a0d28; transform: translateY(-1px); }

                @media print {
                    @page { margin: 1.2cm; size: A4 portrait; }
                    body { padding: 0; font-size: 12px; }
                    .no-print { display: none !important; }
                    table { page-break-inside: auto; }
                    tr    { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    .links-section { page-break-before: auto; }
                    .link-row { page-break-inside: avoid; }
                    .link-url { color: #7B1338 !important; }
                    a { color: #7B1338 !important; }
                }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button onclick="window.print()">🖨️ Print / Save as PDF</button>
            </div>
            
            <!-- Branded Header -->
            <div class="header-flex">
                <div>
                    <h1 class="logo-text">Parinay Saree</h1>
                    <div class="logo-sub">Product Catalog — ${catName}</div>
                </div>
                <div class="meta-text">
                    <strong>Date:</strong> ${d}<br>
                    <strong>Filter:</strong> ${tabName}<br>
                    <strong>Total Items:</strong> ${filtered.length}
                </div>
            </div>

            <!-- ── SECTION 1: Product Table with Photos ── -->
            <div class="section-title">📦 Product Inventory</div>
            <table>
                <thead>
                    <tr>
                        <th class="text-center" style="width:4%">#</th>
                        <th style="width:8%">Photo</th>
                        <th style="width:25%">Product Name</th>
                        <th style="width:12%" class="text-right">Price</th>
                        <th style="width:8%" class="text-center">Stock</th>
                        <th style="width:8%" class="text-center">Discount</th>
                        <th style="width:10%" class="text-center">Badge</th>
                        <th style="width:10%" class="text-center">Status</th>
                        <th style="width:15%" class="text-center">Link</th>
                    </tr>
                </thead>
                <tbody>`;

        filtered.forEach((p, idx) => {
            const priceStr = String(p.price || '').replace(/[^0-9.]/g, '');
            const price = parseFloat(priceStr) || 0;
            const stock = p.stock !== undefined ? p.stock : 10;
            const discount = p.discount || 0;
            const badge = p.badge || '';
            const status = (p.status || 'live');
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
            const badgeClass = { new: 'badge-new', sale: 'badge-sale', trending: 'badge-trending' }[badge] || '';
            const badgeHTML = badge ? `<span class="badge-pill ${badgeClass}">${badge}</span>` : '-';
            const imgSrc = p.image || '';
            const productUrl = `${baseUrl}${categoryPage}#${p.id || ''}`;
            
            const linkHTML = status === 'live' 
                ? `<a href="${productUrl}" target="_blank" style="color:#7B1338;text-decoration:none;font-weight:600;font-size:11px;">Visit Site ↗</a>` 
                : `<span style="color:#aaa;font-weight:600;font-size:11px;">Link Unavailable</span>`;

            html += `
                    <tr>
                        <td class="text-center" style="color:#aaa;">${idx + 1}</td>
                        <td class="text-center">
                            ${imgSrc ? `<img class="product-thumb" src="${imgSrc}" alt="${p.name}" onerror="this.style.display='none'">` : '<div style="width:62px;height:62px;background:#f5f5f5;border-radius:6px;display:inline-block;"></div>'}
                        </td>
                        <td>
                            <div class="product-name-cell">
                                ${p.name}
                                <div class="prod-id">${p.id || ''}</div>
                            </div>
                        </td>
                        <td class="text-right" style="font-weight:700;">₹${price.toLocaleString('en-IN')}</td>
                        <td class="text-center">${stock <= 0 ? '<span style="color:#c53030;">Out of Stock</span>' : stock}</td>
                        <td class="text-center">${discount > 0 ? `<span style="color:#7B1338;font-weight:600;">${discount}% Off</span>` : '-'}</td>
                        <td class="text-center">${badgeHTML}</td>
                        <td class="text-center status-${status}">${statusLabel}</td>
                        <td class="text-center">
                            ${linkHTML}
                        </td>
                    </tr>`;
        });

        html += `
                </tbody>
            </table>

            <div class="footer-note">
                Generated by Parinay Saree Admin Dashboard &bull; ${d} &bull; ${filtered.length} products exported
            </div>

            <script>
                // Wait for all product images to load before auto-printing
                window.addEventListener('load', function() {
                    const imgs = document.querySelectorAll('img');
                    let loaded = 0;
                    if (imgs.length === 0) { setTimeout(() => window.print(), 300); return; }
                    const tryPrint = () => { loaded++; if (loaded >= imgs.length) setTimeout(() => window.print(), 300); };
                    imgs.forEach(img => {
                        if (img.complete) { tryPrint(); }
                        else { img.addEventListener('load', tryPrint); img.addEventListener('error', tryPrint); }
                    });
                });
            </script>
        </body>
        </html>`;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    }

};

window.addEventListener('beforeunload', function (e) {
    if (app.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});