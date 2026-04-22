// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
var ALL_PRODUCTS = [];   // {id, name, priceNum, category}
var ITEMS = [];          // {uid, name, priceNum, qty, category}
var UID = 1;
var EDITING_BILL = null;
var BILLS_SORT = 'invoice';
var BILLS_SORT_DIR = 1; // -1 = desc, 1 = asc
var TIME_OFFSET_MS = 0;  // ms difference between online time and system clock

// For modal: which products are toggled
var MODAL_SELECTED = {};   // uid → {id, name, priceNum, category}
var MODAL_TAB = 'all';

var CUSTOMER_DB = null;
window.SECRET_PIN = '';

// ═══════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════
async function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./bill-sw.js').catch(function(err) { console.log('SW registration failed:', err); });
  }

  // Sync time from network first so dates are always correct
  await syncOnlineTime();

  // Set date
  document.getElementById('inv-date').value = todayStr();

  // Set invoice number from localStorage (auto-increment)
  var lastNum = parseInt(localStorage.getItem('parinay_inv_num') || '999');
  var nextNum = lastNum + 1;
  document.getElementById('inv-num').value = 'INV-' + nextNum;

  // Check if we have a cached database in localStorage
  var cachedDB = localStorage.getItem('parinay_cached_db');
  if (cachedDB) {
    try {
      var data = JSON.parse(cachedDB);
      if (data.customers) {
        CUSTOMER_DB = data;
        document.getElementById('db-init-overlay').classList.remove('open');
        toast('🔄 Loaded cached database from browser session', 'info');
      }
    } catch (e) { }
  }

  // Fetch products
  await fetchProducts();

  // Hide loader
  var l = document.getElementById('loader');
  l.classList.add('gone');
  setTimeout(function () { l.style.display = 'none'; }, 350);

  render();
}

// Fetch accurate IST time from worldtimeapi.org and store the offset
async function syncOnlineTime() {
  try {
    var r = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata', { cache: 'no-store' });
    if (r.ok) {
      var data = await r.json();
      // data.datetime is ISO 8601 with offset, e.g. "2026-04-22T02:12:51.123+05:30"
      var serverMs = new Date(data.datetime).getTime();
      TIME_OFFSET_MS = serverMs - Date.now();
    }
  } catch (e) {
    // Silently fall back to system clock if offline
    TIME_OFFSET_MS = 0;
  }
}

async function fetchProducts() {
  var REMOTE = 'https://raw.githubusercontent.com/Apoc-lengend/saree/main/data.json';
  var LOCAL = 'data.json';
  var data = null;

  try {
    var r = await fetch(REMOTE + '?t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) data = await r.json();
  } catch (e) { }

  if (!data) {
    try {
      var r2 = await fetch(LOCAL + '?t=' + Date.now(), { cache: 'no-store' });
      if (r2.ok) data = await r2.json();
    } catch (e) { }
  }

  if (data && data.products) {
    var live = function (p) { return !p.status || p.status === 'live'; };
    (data.products.sarees || []).filter(live).forEach(function (p) {
      ALL_PRODUCTS.push({ id: p.id, name: p.name, priceNum: parsePrice(p.price), category: 'Saree' });
    });
    (data.products.bedsheets || []).filter(live).forEach(function (p) {
      ALL_PRODUCTS.push({ id: p.id, name: p.name, priceNum: parsePrice(p.price), category: 'Bedsheet' });
    });
    (data.products.lehenga || data.products.lehengas || []).filter(live).forEach(function (p) {
      ALL_PRODUCTS.push({ id: p.id, name: p.name, priceNum: parsePrice(p.price), category: 'Lehenga' });
    });
    toast('✅ ' + ALL_PRODUCTS.length + ' products loaded', 'ok');
  } else {
    toast('⚠️ Cannot reach product catalog. Add custom items via the modal.', 'err');
  }
}

// ═══════════════════════════════════════════════
//  ITEMS — fixed, no getElementById inside
// ═══════════════════════════════════════════════
function rebuildList() {
  var list = document.getElementById('items-list');
  if (!ITEMS.length) {
    list.innerHTML = '<div class="li-empty">No items yet. Click "Add Products" above.</div>';
    return;
  }
  var html = ITEMS.map(function (it) {
    return '<div class="li-card" id="li-' + it.uid + '">' +
      '<div style="min-width:0;"><div class="li-name">' + esc(it.name) + '</div><div class="li-cat">' + esc(it.category) + '</div></div>' +
      '<div style="display:flex; align-items:center; gap:4px;">' +
      '<button type="button" class="qty-btn" onclick="stepQty(' + it.uid + ', -1)">-</button>' +
      '<input class="li-qty" id="li-qty-' + it.uid + '" style="width:36px; text-align:center; padding:2px; height:24px;" type="number" min="1" value="' + it.qty + '" oninput="changeQty(' + it.uid + ',this.value)"/>' +
      '<button type="button" class="qty-btn" onclick="stepQty(' + it.uid + ', 1)">+</button>' +
      '</div>' +
      '<div class="li-price" id="lip-' + it.uid + '">' + fmt(it.priceNum * it.qty) + '</div>' +
      '<button class="li-del" onclick="removeItem(' + it.uid + ')">✕</button>' +
      '</div>';
  }).join('');
  list.innerHTML = html;
}

function addItemToList(name, priceNum, category) {
  // If already in list, increment qty
  var ex = null;
  for (var i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].name === name && ITEMS[i].category === category) { ex = ITEMS[i]; break; }
  }
  if (ex) { ex.qty++; } else { ITEMS.push({ uid: UID++, name: name, priceNum: priceNum, qty: 1, category: category }); }
}

function removeItem(uid) {
  // filter by uid (plain comparison, no arrow fn needed for safety)
  var next = [];
  for (var i = 0; i < ITEMS.length; i++) { if (ITEMS[i].uid !== uid) next.push(ITEMS[i]); }
  ITEMS = next;
  rebuildList();
  render();
}

function changeQty(uid, val) {
  var q = Math.max(1, parseInt(val) || 1);
  for (var i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].uid === uid) {
      ITEMS[i].qty = q;
      var el = document.getElementById('lip-' + uid);
      if (el) el.textContent = fmt(ITEMS[i].priceNum * q);
      break;
    }
  }
  render();
}

function stepQty(uid, delta) {
  var el = document.getElementById('li-qty-' + uid);
  if (!el) return;
  var q = Math.max(1, (parseInt(el.value) || 1) + delta);
  el.value = q;
  changeQty(uid, q);
}

// ═══════════════════════════════════════════════
//  PRODUCT MODAL
// ═══════════════════════════════════════════════
function openProdModal() {
  MODAL_SELECTED = {};
  document.getElementById('modal-search').value = '';
  switchTab('all');
  document.getElementById('prod-modal-overlay').classList.add('open');
  updateSelCount();
  setTimeout(function () { document.getElementById('modal-search').focus(); }, 200);
}
function closeProdModal() {
  document.getElementById('prod-modal-overlay').classList.remove('open');
}
function closeProdModalOnBg(e) {
  if (e.target === document.getElementById('prod-modal-overlay')) closeProdModal();
}

function switchTab(tab) {
  MODAL_TAB = tab;
  document.querySelectorAll('.m-tab').forEach(function (el) { el.classList.toggle('active', el.dataset.tab === tab); });
  renderModalProducts();
}

function filterModalProducts() { renderModalProducts(); }

function renderModalProducts() {
  var q = (document.getElementById('modal-search').value || '').toLowerCase().trim();
  var tab = MODAL_TAB;

  // Filter
  var filtered = ALL_PRODUCTS.filter(function (p) {
    var matchTab = (tab === 'all') || (p.category === tab);
    var matchQ = !q || p.name.toLowerCase().indexOf(q) !== -1;
    return matchTab && matchQ;
  });

  var body = document.getElementById('modal-body');

  if (!filtered.length && !ALL_PRODUCTS.length) {
    // No products loaded — show custom add option
    body.innerHTML = '<div class="modal-none">No products loaded from catalog.<br/>Close this and ask your admin to check the data.json URL.<br/><br/>' +
      '<button onclick="addCustomFromModal()" style="margin-top:12px;padding:9px 20px;background:var(--p);color:#fff;border:none;border-radius:8px;font:inherit;font-size:.86rem;font-weight:600;cursor:pointer;">+ Add Custom Item</button></div>';
    return;
  }

  if (!filtered.length) {
    body.innerHTML = '<div class="modal-none">No products match "<strong>' + esc(q) + '</strong>"</div>';
    return;
  }

  // Group by category
  var groups = {};
  filtered.forEach(function (p) {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  });

  var html = '';
  Object.keys(groups).sort().forEach(function (cat) {
    html += '<div class="prod-section"><div class="prod-sec-title">' + esc(cat) + 's (' + groups[cat].length + ')</div><div class="prod-grid">';
    groups[cat].forEach(function (p) {
      var sel = !!MODAL_SELECTED[p.id];
      html += '<div class="prod-card' + (sel ? ' selected' : '') + '" onclick="toggleProduct(\'' + p.id + '\')">' +
        '<div class="pc-cat">' + esc(p.category) + '</div>' +
        '<div class="pc-name">' + esc(p.name) + '</div>' +
        '<div class="pc-price">' + fmt(p.priceNum) + '</div>' +
        '<div class="pc-check">✔ Selected</div>' +
        '</div>';
    });
    html += '</div></div>';
  });

  // Add custom item option at bottom
  html += '<div style="text-align:center;padding:12px 0 4px;">' +
    '<button onclick="addCustomFromModal()" style="padding:8px 18px;background:none;border:2px dashed var(--bd);border-radius:8px;font:inherit;font-size:.8rem;color:var(--tl);cursor:pointer;" ' +
    'onmouseover="this.style.borderColor=\'var(--p)\';this.style.color=\'var(--p)\'" ' +
    'onmouseout="this.style.borderColor=\'var(--bd)\';this.style.color=\'var(--tl)\'">＋ Add custom item</button></div>';

  body.innerHTML = html;
}

function toggleProduct(prodId) {
  var p = null;
  for (var i = 0; i < ALL_PRODUCTS.length; i++) { if (ALL_PRODUCTS[i].id === prodId) { p = ALL_PRODUCTS[i]; break; } }
  if (!p) return;
  if (MODAL_SELECTED[prodId]) { delete MODAL_SELECTED[prodId]; }
  else { MODAL_SELECTED[prodId] = p; }
  renderModalProducts();
  updateSelCount();
}

function updateSelCount() {
  var n = Object.keys(MODAL_SELECTED).length;
  document.getElementById('m-sel-count').textContent = n ? n + ' selected' : '0 selected';
}

function addSelectedProducts() {
  var keys = Object.keys(MODAL_SELECTED);
  if (!keys.length) { toast('Select at least one product first.', 'err'); return; }
  keys.forEach(function (k) { var p = MODAL_SELECTED[k]; addItemToList(p.name, p.priceNum, p.category); });
  rebuildList();
  render();
  closeProdModal();
  toast('✅ ' + keys.length + ' item(s) added to bill', 'ok');
}

function addCustomFromModal() {
  closeProdModal();
  setTimeout(function () {
    var name = prompt('Custom item name:');
    if (!name || !name.trim()) return;
    var raw = prompt('Unit price (₹):');
    var price = parseFloat(raw);
    if (isNaN(price) || price < 0) { toast('Invalid price entered.', 'err'); return; }
    addItemToList(name.trim(), price, 'Custom');
    rebuildList();
    render();
    toast('✅ Custom item added', 'ok');
  }, 300);
}

// ═══════════════════════════════════════════════
//  RENDER BILL PREVIEW
// ═══════════════════════════════════════════════
function render() {
  var has = ITEMS.length > 0;
  document.getElementById('b-empty').style.display = has ? 'none' : '';
  document.getElementById('b-content').style.display = has ? '' : 'none';
  if (!has) return;

  var sName = gv('s-name') || 'Parinay Saree';
  var sAddr = gv('s-addr') || '';
  var sPhone = gv('s-phone') || '';
  var sGST = gv('s-gst') || '';
  var iNum = gv('inv-num') || 'INV-1000';
  var iDate = gv('inv-date') || '';
  var cName = gv('c-name') || '';
  var cAddr = gv('c-addr') || '';
  var cPhone = gv('c-phone') || '';
  var cCity = gv('c-city') || '';
  var gstR = parseFloat(gv('gst-rate')) || 0;
  var discR = parseFloat(gv('disc-rate')) || 0;
  var deliv = parseFloat(gv('delivery')) || 0;
  var notes = gv('notes') || '';

  setText('b-co-name', sName);
  setText('b-co-info', [sAddr, sPhone].filter(Boolean).join(' | '));
  setText('b-inv-num', '#' + iNum);
  setText('b-inv-dt', iDate ? fmtDate(iDate) : '');
  setText('b-gstin', sGST ? 'GSTIN: ' + sGST : '');

  var ch = '<span class="bld">' + (cName || '—') + '</span>';
  if (cAddr) ch += '<br>' + esc(cAddr);
  if (cCity) ch += '<br>' + esc(cCity);
  if (cPhone) ch += '<br>' + esc(cPhone);
  document.getElementById('b-cust').innerHTML = ch;

  var subtotal = 0;
  var rows = ITEMS.map(function (it, i) {
    var amt = it.priceNum * it.qty;
    subtotal += amt;
    return '<tr>' +
      '<td style="color:#bbb;font-size:.73rem;">' + (i + 1) + '</td>' +
      '<td style="text-align:left;"><div class="td-n">' + esc(it.name) + '</div><div class="td-c">' + esc(it.category) + '</div></td>' +
      '<td>' + it.qty + '</td>' +
      '<td>' + fmt(it.priceNum) + '</td>' +
      '<td class="td-a">' + fmt(amt) + '</td>' +
      '</tr>';
  });
  document.getElementById('b-tbody').innerHTML = rows.join('');

  var discAmt = subtotal * discR / 100;
  var after = subtotal - discAmt;
  var gstAmt = after * gstR / 100;
  var grand = after + gstAmt + deliv;

  setText('b-sub', fmt(subtotal));

  showEl('b-disc-row', discR > 0);
  if (discR > 0) { setText('b-dp', discR); setText('b-dv', '-' + fmt(discAmt)); }
  showEl('b-gst-row', gstR > 0);
  if (gstR > 0) { setText('b-gp', gstR); setText('b-gv', fmt(gstAmt)); }
  showEl('b-del-row', deliv > 0);
  if (deliv > 0) { setText('b-dlv', fmt(deliv)); }

  setText('b-total', fmt(grand));
  setText('b-fn', sName);
  setText('b-fp', sPhone || 'store contact');
  setText('b-notes-out', notes ? notes : 'Thank you for your business!');

  generateVerificationId().then(function (vid) {
    setText('b-ver-id', vid);
  });
}

// ═══════════════════════════════════════════════
//  INVOICE NUMBER — bump & persist
// ═══════════════════════════════════════════════
function bumpInvoiceNumber() {
  var cur = gv('inv-num');
  var num = parseInt(cur.replace(/[^0-9]/g, '')) || 1000;
  localStorage.setItem('parinay_inv_num', num);
}


// ═══════════════════════════════════════════════
//  SHARE & DOWNLOAD
// ═══════════════════════════════════════════════

// Capture element → JPEG image blob (for sharing)
function _captureBillEl(el, filename) {
  if (typeof html2canvas === 'undefined') { toast('Not available offline.', 'err'); return; }
  toast('Generating image…', 'info');
  html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
    .then(function (canvas) {
      canvas.toBlob(function (blob) {
        var file = new File([blob], filename, { type: 'image/jpeg' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ title: filename.replace('.jpg', ''), files: [file] })
            .then(function () { toast('✅ Shared!', 'ok'); })
            .catch(function () { });
        } else {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
          toast('✅ Saved as ' + filename, 'ok');
        }
      }, 'image/jpeg', 0.95);
    })
    .catch(function (e) { toast('Could not capture image.', 'err'); console.error(e); });
}

// Capture element → PDF via html2canvas + jsPDF
function _captureBillElPdf(el, filename) {
  if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
    toast('PDF generation not available offline.', 'err'); return;
  }
  toast('Generating PDF…', 'info');
  html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
    .then(function (canvas) {
      var imgData = canvas.toDataURL('image/jpeg', 0.95);
      var pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      var pageW = pdf.internal.pageSize.getWidth();
      var pageH = pdf.internal.pageSize.getHeight();
      // Fit image width to page, scale height proportionally
      var imgW = pageW;
      var imgH = (canvas.height / canvas.width) * imgW;
      // If taller than A4, shrink to fit height
      if (imgH > pageH) { imgW = (canvas.width / canvas.height) * pageH; imgH = pageH; }
      var x = (pageW - imgW) / 2;
      pdf.addImage(imgData, 'JPEG', x, 0, imgW, imgH);
      pdf.save(filename);
      toast('✅ PDF saved!', 'ok');
    })
    .catch(function (e) { toast('Could not generate PDF.', 'err'); console.error(e); });
}

async function downloadBill() {
  if (!ITEMS.length) { toast('Add at least one product first.', 'err'); return; }
  var billEl = document.getElementById('bill');
  if (!billEl || !billEl.firstElementChild) { toast('Preview is empty.', 'err'); return; }
  _captureBillElPdf(billEl, 'Invoice-' + (gv('inv-num') || 'Bill') + '.pdf');
}

function shareBillHtml(html, order, customer) {
  var el = document.getElementById('bill-view-content');
  // Try share as image; fallback generates PDF
  if (navigator.share || (navigator.canShare)) {
    _captureBillEl(el, 'Invoice-' + order.invoiceNum + '.jpg');
  } else {
    _captureBillElPdf(el, 'Invoice-' + order.invoiceNum + '.pdf');
  }
}



// ═══════════════════════════════════════════════
//  CUSTOM DIALOG (replaces native alert/confirm)
// ═══════════════════════════════════════════════
function showDialog(icon, msg, buttons) {
  document.getElementById('dialog-icon').textContent = icon;
  document.getElementById('dialog-msg').innerHTML = msg;
  var wrap = document.getElementById('dialog-btns');
  wrap.innerHTML = '';
  buttons.forEach(function (b) {
    var btn = document.createElement('button');
    btn.textContent = b.label;
    btn.className = 'btn ' + (b.cls || 'btn-outline');
    btn.style.flex = '1';
    btn.onclick = function () {
      document.getElementById('dialog-overlay').classList.remove('open');
      if (b.cb) b.cb();
    };
    wrap.appendChild(btn);
  });
  document.getElementById('dialog-overlay').classList.add('open');
}
function showAlert(msg) { showDialog('ℹ️', msg, [{ label: 'OK', cls: 'btn-primary' }]); }
function showConfirm(msg, onYes) {
  showDialog('⚠️', msg, [
    { label: 'Yes, proceed', cls: 'btn-primary', cb: onYes },
    { label: 'Cancel', cls: 'btn-outline' }
  ]);
}

function hardResetApp() {
  showConfirm('This will completely clear your local database, saved bills, and cached settings. This action cannot be undone. Start fresh?', function() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload(true);
  });
}

function setSecretKey() {
  if (!window.crypto || !window.crypto.subtle) {
    showAlert('Cannot set Secret Key. Please use a secure environment (HTTPS or localhost) to access cryptographic features.');
    return;
  }
  var pin = prompt('Enter the Session Secret Key for Bill Verification:');
  if (pin !== null && pin.trim() !== '') {
    window.SECRET_PIN = pin.trim();
    toast('Secret Key set for this session', 'ok');
    render();
  }
}

// ═══════════════════════════════════════════════
//  CUSTOMER RECORDS  (File-Based Local JSON)
// ═══════════════════════════════════════════════

function handleDbUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (evt) {
    try {
      var data = JSON.parse(evt.target.result);
      if (!data.customers) throw new Error('Invalid structure');
      CUSTOMER_DB = data;

      var maxNum = 0;
      data.customers.forEach(function (c) {
        (c.orders || []).forEach(function (o) {
          var num = parseInt((o.invoiceNum || '').replace(/[^0-9]/g, '')) || 0;
          if (num > maxNum) maxNum = num;
        });
      });
      if (maxNum > 0) {
        localStorage.setItem('parinay_inv_num', maxNum);
        document.getElementById('inv-num').value = 'INV-' + (maxNum + 1);
      }

      try { localStorage.setItem('parinay_cached_db', JSON.stringify(CUSTOMER_DB)); } catch (e) { }

      // Reset unsaved changes flag if we explicitly loaded a new file
      try { localStorage.removeItem('parinay_db_needs_export'); } catch (e) { }

      toast('✅ Database loaded successfully', 'ok');
      document.getElementById('db-init-overlay').classList.remove('open');

      // Clear the input so the same file can be selected again
      e.target.value = '';

      // Refresh UI if modals are open
      if (document.getElementById('bills-modal-overlay').classList.contains('open')) renderBillsModal();
      if (document.getElementById('cust-modal-overlay').classList.contains('open')) renderCustModal();
    } catch (err) {
      showAlert('⚠️ Invalid customers.json file. Please check the format and try again.');
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}

function handleTopBarUpload(e) { handleDbUpload(e); }

function startFreshDb() {
  CUSTOMER_DB = { customers: [] };
  try { localStorage.setItem('parinay_cached_db', JSON.stringify(CUSTOMER_DB)); } catch (e) { }
  toast('✨ Started fresh database', 'ok');
  document.getElementById('db-init-overlay').classList.remove('open');
}


function loadCustomers() {
  return CUSTOMER_DB || { customers: [] };
}
function saveCustomers(db) {
  CUSTOMER_DB = db;
  try { localStorage.setItem('parinay_cached_db', JSON.stringify(db)); } catch (e) { }
}

function addCustomerContact() {
  if (!window.SECRET_PIN) { toast('🔑 Please set the Secret Key first.', 'err'); return; }
  var name = gv('c-name').trim();
  var phone = gv('c-phone').trim();
  var city = gv('c-city').trim();
  var addr = gv('c-addr').trim();
  if (!name) { toast('Enter a customer name first.', 'err'); return; }
  var db = loadCustomers();
  var idx = -1;
  for (var i = 0; i < db.customers.length; i++) {
    var c = db.customers[i];
    if ((phone && c.phone === phone) || (!phone && c.name.toLowerCase() === name.toLowerCase())) { idx = i; break; }
  }
  if (idx !== -1) {
    if (name) db.customers[idx].name = name;
    if (phone) db.customers[idx].phone = phone;
    if (city) db.customers[idx].city = city;
    if (addr) db.customers[idx].address = addr;
    saveCustomers(db);
    toast('✅ Customer details updated', 'ok');
  } else {
    db.customers.push({ id: 'cust_' + Date.now(), name: name, phone: phone, city: city, address: addr, orders: [], totalSpent: 0, lastSeen: todayStr() });
    saveCustomers(db);
    toast('✅ Customer added to list', 'ok');
  }
}

async function saveCustomer(isAuto) {
  if (!window.SECRET_PIN) { toast('🔑 Please set the Secret Key first.', 'err'); return false; }
  if (!ITEMS.length) { toast('Add at least one product first.', 'err'); return false; }
  var name = gv('c-name').trim();
  var phone = gv('c-phone').trim();
  var city = gv('c-city').trim();
  var addr = gv('c-addr').trim();

  if (!name) { toast('Enter customer name before saving.', 'err'); return false; }

  var iNum = gv('inv-num') || 'INV-1000';
  var iDate = gv('inv-date') || todayStr();
  var grand = calcGrand();
  var orderItems = ITEMS.map(function (it) { return { name: it.name, category: it.category, qty: it.qty, unitPrice: it.priceNum, total: it.priceNum * it.qty }; });
  var notesStr = gv('notes').trim();

  var vid = await generateVerificationId();
  var order = { invoiceNum: iNum, date: iDate, items: orderItems, grand: grand, verificationId: vid, notes: notesStr };

  var db = loadCustomers();

  // ── EDIT MODE: overwrite the existing order in-place ──
  if (EDITING_BILL) {
    var ec = db.customers.find(function (c) { return c.id === EDITING_BILL.custId; });
    if (ec) {
      var oldOrderIdx = ec.orders.findIndex(function (o) { return o.invoiceNum === EDITING_BILL.invNum; });
      if (oldOrderIdx !== -1) {
        var oldGrand = ec.orders[oldOrderIdx].grand || 0;
        ec.orders[oldOrderIdx] = order;
        ec.totalSpent = (ec.totalSpent || 0) - oldGrand + grand;
        ec.lastSeen = iDate;
        if (name) ec.name = name;
        if (phone) ec.phone = phone;
        if (city) ec.city = city;
        if (addr) ec.address = addr;
        saveCustomers(db);
        EDITING_BILL = null;
        setSaveBtnLabel(false);
        bumpInvoiceNumber();
        if (!isAuto) toast('✅ Bill updated!', 'ok');
        return true;
      }
    }
    EDITING_BILL = null; // stale ref, fall through to normal save
  }

  // ── NORMAL MODE: find/create customer and push new order ──
  var idx = -1;
  for (var i = 0; i < db.customers.length; i++) {
    var c = db.customers[i];
    if ((phone && c.phone === phone) || (!phone && c.name.toLowerCase() === name.toLowerCase())) { idx = i; break; }
  }

  var savedCustId;
  if (idx !== -1) {
    // Check if an order with this exact invoice number already exists — update it instead of duplicating
    var existIdx = db.customers[idx].orders.findIndex(function (o) { return o.invoiceNum === iNum; });
    if (existIdx !== -1) {
      var oldG = db.customers[idx].orders[existIdx].grand || 0;
      db.customers[idx].orders[existIdx] = order;
      db.customers[idx].totalSpent = (db.customers[idx].totalSpent || 0) - oldG + grand;
    } else {
      db.customers[idx].orders.push(order);
      db.customers[idx].totalSpent = (db.customers[idx].totalSpent || 0) + grand;
    }
    db.customers[idx].lastSeen = iDate;
    if (name) db.customers[idx].name = name;
    if (city) db.customers[idx].city = city;
    if (addr) db.customers[idx].address = addr;
    savedCustId = db.customers[idx].id;
  } else {
    var newCust = { id: 'cust_' + Date.now(), name: name, phone: phone, city: city, address: addr, orders: [order], totalSpent: grand, lastSeen: iDate };
    db.customers.push(newCust);
    savedCustId = newCust.id;
  }

  saveCustomers(db);
  // Track this bill so a subsequent print/save doesn't duplicate it
  EDITING_BILL = { custId: savedCustId, invNum: iNum };
  bumpInvoiceNumber();
  if (!isAuto) toast('💾 Bill saved!', 'ok');
  return true;
}

function openCustModal() {
  document.getElementById('cust-search').value = '';
  renderCustModal('');
  document.getElementById('cust-modal-overlay').classList.add('open');
}
function closeCustModal() {
  document.getElementById('cust-modal-overlay').classList.remove('open');
}
function closeCustModalOnBg(e) {
  if (e.target === document.getElementById('cust-modal-overlay')) closeCustModal();
}

function filterCustModal() {
  var q = (document.getElementById('cust-search').value || '').toLowerCase().trim();
  renderCustModal(q);
}

var SELECTED_CUSTS = new Set();
function toggleCustSelection(e, id) {
  e.stopPropagation();
  if (SELECTED_CUSTS.has(id)) SELECTED_CUSTS.delete(id);
  else SELECTED_CUSTS.add(id);
  updateCustFooter();
}

function updateCustFooter() {
  var foot = document.getElementById('cust-foot-actions');
  var countEl = document.getElementById('c-sel-count');
  if (SELECTED_CUSTS.size > 0) {
    foot.style.display = 'flex';
    countEl.textContent = SELECTED_CUSTS.size + ' selected';
  } else {
    foot.style.display = 'none';
  }
}

function deleteSelectedCustomers() {
  if (SELECTED_CUSTS.size === 0) return;
  showConfirm('Delete ' + SELECTED_CUSTS.size + ' customer(s) and all their bills?', function () {
    var db = loadCustomers();
    db.customers = db.customers.filter(function(c) { return !SELECTED_CUSTS.has(c.id); });
    saveCustomers(db);
    SELECTED_CUSTS.clear();
    updateCustFooter();
    renderCustModal(document.getElementById('cust-search').value.toLowerCase().trim());
    toast('Customers deleted', 'ok');
  });
}

function renderCustModal(q) {
  var db = loadCustomers();
  var list = db.customers;
  var sumEl = document.getElementById('cust-summary');
  var listEl = document.getElementById('cust-list');

  var totalSpent = 0;
  list.forEach(function (c) { totalSpent += (c.totalSpent || 0); });
  sumEl.textContent = list.length + ' customers · ₹' + Math.round(totalSpent).toLocaleString('en-IN') + ' total billed';

  // Filter list
  if (q) {
    list = list.filter(function(c) {
      if ((c.name || '').toLowerCase().indexOf(q) !== -1) return true;
      // Search in orders
      if (c.orders && c.orders.length) {
        for (var i = 0; i < c.orders.length; i++) {
          var o = c.orders[i];
          if ((o.invoiceNum || '').toLowerCase().indexOf(q) !== -1) return true;
          if ((o.verificationId || '').toLowerCase().indexOf(q) !== -1) return true;
        }
      }
      return false;
    });
  }

  if (!list.length) {
    listEl.innerHTML = '<div class="cust-empty"><div class="icon">👥</div><p>' + (q ? 'No customers found for "' + esc(q) + '"' : 'No customer records yet.<br/>Save a bill to record a customer.') + '</p></div>';
    return;
  }

  // Sort by lastSeen descending
  var sorted = list.slice().sort(function (a, b) { return (b.lastSeen || '') > (a.lastSeen || '') ? 1 : -1; });

  listEl.innerHTML = sorted.map(function (c) {
    var orderCount = (c.orders || []).length;

    var tilesHtml = orderCount === 0
      ? '<p style="font-size:.78rem;color:var(--tl);margin:4px 0;">No bills yet.</p>'
      : '<div class="cc-bills-grid">' +
          (c.orders || []).slice().reverse().map(function (o) {
            return '<div class="cc-bill-tile" onclick="event.stopPropagation(); viewArchivedBill(\'' + c.id + '\',\'' + o.invoiceNum + '\')">' +
              '<div class="cc-bill-tile-inv">' + esc(o.invoiceNum) + '</div>' +
              '<div class="cc-bill-tile-amt">' + fmt(o.grand || 0) + '</div>' +
              '<div class="cc-bill-tile-date">' + fmtDate(o.date) + '</div>' +
              '</div>';
          }).join('') +
        '</div>';

    var isChecked = SELECTED_CUSTS.has(c.id) ? 'checked' : '';
    return '<div class="cust-card" onclick="toggleCustCard(this)">' +
      '<div class="cust-card-head" style="display:flex; align-items:center; gap:12px;">' +
        '<input type="checkbox" style="transform:scale(1.3); cursor:pointer;" onclick="toggleCustSelection(event, \'' + c.id + '\')" ' + isChecked + ' />' +
        '<div style="flex:1;"><div class="cc-name">' + esc(c.name || '—') + '</div>' +
        '<div class="cc-phone">' + (c.phone || '') + (c.city ? ' · ' + esc(c.city) : '') + '</div></div>' +
        '<div style="text-align:right;"><div class="cc-spent">' + fmt(c.totalSpent || 0) + '</div>' +
        '<div class="cc-orders">' + orderCount + ' order' + (orderCount !== 1 ? 's' : '') + '</div></div>' +
      '</div>' +
      '<div class="cc-history">' + tilesHtml + '</div>' +
      '</div>';
  }).join('');
  updateCustFooter();
}

function openPickCustomer() {
  renderPickCustomer('');
  document.getElementById('pick-cust-search').value = '';
  document.getElementById('pick-cust-overlay').classList.add('open');
  setTimeout(function () { document.getElementById('pick-cust-search').focus(); }, 150);
}
function closePickCustomer() { document.getElementById('pick-cust-overlay').classList.remove('open'); }
function closePickCustomerOnBg(e) { if (e.target === document.getElementById('pick-cust-overlay')) closePickCustomer(); }

function filterPickCustomer() {
  var q = document.getElementById('pick-cust-search').value.toLowerCase();
  renderPickCustomer(q);
}

function renderPickCustomer(q) {
  var db = loadCustomers();
  var list = db.customers.slice().sort(function (a, b) { return (b.lastSeen || '') > (a.lastSeen || '') ? 1 : -1; });
  if (q) list = list.filter(function (c) { return (c.name || '').toLowerCase().indexOf(q) !== -1 || (c.phone || '').indexOf(q) !== -1; });
  var el = document.getElementById('pick-cust-list');
  if (!list.length) {
    el.innerHTML = '<div style="padding:28px; text-align:center; color:var(--tl);">No customers found.</div>';
    return;
  }
  el.innerHTML = list.map(function (c) {
    return '<div style="padding:13px 18px; border-bottom:1px solid var(--bd); cursor:pointer; transition:background .15s;" ' +
      'onmouseover="this.style.background=\'var(--plt)\'" onmouseout="this.style.background=\'#fff\'" ' +
      'onclick="pickCustomer(\'' + c.id + '\')">' +
      '<div style="font-weight:700; color:var(--t); font-size:.9rem;">' + esc(c.name || '—') + '</div>' +
      '<div style="font-size:.76rem; color:var(--tm); margin-top:2px;">' + (c.phone || '') + (c.city ? ' · ' + esc(c.city) : '') + '</div>' +
      '</div>';
  }).join('');
}

function pickCustomer(id) {
  var db = loadCustomers();
  var c = db.customers.find(function (c) { return c.id === id; });
  if (!c) return;
  document.getElementById('c-name').value = c.name || '';
  document.getElementById('c-phone').value = c.phone || '';
  document.getElementById('c-city').value = c.city || '';
  document.getElementById('c-addr').value = c.address || '';
  updateClearBtn();
  render();
  closePickCustomer();
  toast('Customer loaded', 'ok');
}

function prepareNewCustomer() {
  ['c-name', 'c-phone', 'c-city', 'c-addr'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('c-name').focus();
  updateClearBtn();
  render();
}

function updateClearBtn() {
  var val = document.getElementById('c-name').value;
  var btn = document.getElementById('c-name-clear');
  if (btn) btn.style.display = val ? 'block' : 'none';
}

function clearCustomerFields() {
  ['c-name', 'c-phone', 'c-city', 'c-addr'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
  updateClearBtn();
  render();
}

function setSaveBtnLabel(isEdit) {
  var btn = document.getElementById('save-bill-btn');
  if (btn) btn.textContent = isEdit ? '🔄 Update Saved Bill' : '💾 Save the Bill';
}

function toggleCustCard(el) {
  el.classList.toggle('expanded');
}

function exportCustomers() {
  var db = loadCustomers();
  var json = JSON.stringify(db, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);

  var now = new Date();
  var dStr = now.toISOString().slice(0, 10);
  var h = String(now.getHours()).padStart(2, '0');
  var m = String(now.getMinutes()).padStart(2, '0');
  var s = String(now.getSeconds()).padStart(2, '0');
  a.download = 'Customer_data_' + dStr + '_' + h + m + s + '.json';

  a.click();
  URL.revokeObjectURL(a.href);

  toast('✅ customers.json downloaded. Data safely exported!', 'ok');
}

function clearCustomers() {
  showConfirm('Delete ALL customer records? This cannot be undone.', function () {
    saveCustomers({ customers: [] });
    renderCustModal();
    toast('🗑 Customer records cleared', 'info');
  });
}

// ═══════════════════════════════════════════════
//  BILLS ARCHIVE MODAL
// ═══════════════════════════════════════════════
function openBillsModal() {
  var s = document.getElementById('bills-search');
  if (s) s.value = '';
  renderBillsModal('');
  document.getElementById('bills-modal-overlay').classList.add('open');
}
function filterBills() {
  var q = (document.getElementById('bills-search').value || '').toLowerCase().trim();
  renderBillsModal(q);
}
function closeBillsModal() {
  document.getElementById('bills-modal-overlay').classList.remove('open');
}
function closeBillsModalOnBg(e) {
  if (e.target === document.getElementById('bills-modal-overlay')) closeBillsModal();
}

function setBillsSort(by) {
  if (BILLS_SORT === by) { toggleBillsSortDir(); return; }
  BILLS_SORT = by;
  document.querySelectorAll('.sort-pill[data-s]').forEach(function (b) { b.classList.toggle('active', b.dataset.s === by); });
  renderBillsModal((document.getElementById('bills-search').value || '').toLowerCase().trim());
}
function toggleBillsSortDir() {
  BILLS_SORT_DIR *= -1;
  var btn = document.getElementById('sort-dir-btn');
  if (btn) btn.textContent = BILLS_SORT_DIR === -1 ? '↓ Desc' : '↑ Asc';
  renderBillsModal((document.getElementById('bills-search').value || '').toLowerCase().trim());
}

function renderBillsModal(q) {
  var db = loadCustomers();
  var allBills = [];
  var totalRevenue = 0;
  db.customers.forEach(function (c) {
    (c.orders || []).forEach(function (o) {
      allBills.push({ customer: c, order: o });
      totalRevenue += (o.grand || 0);
    });
  });

  var sumEl = document.getElementById('bills-summary');
  var listEl = document.getElementById('bills-list');
  sumEl.textContent = allBills.length + ' bills · ₹' + Math.round(totalRevenue).toLocaleString('en-IN') + ' total revenue';

  allBills.sort(function (a, b) {
    var va, vb;
    if (BILLS_SORT === 'invoice') { va = a.order.invoiceNum || ''; vb = b.order.invoiceNum || ''; }
    else if (BILLS_SORT === 'name') { va = (a.customer.name || '').toLowerCase(); vb = (b.customer.name || '').toLowerCase(); }
    else if (BILLS_SORT === 'amount') { va = a.order.grand || 0; vb = b.order.grand || 0; }
    else { va = a.order.date || ''; vb = b.order.date || ''; }
    if (va < vb) return -1 * BILLS_SORT_DIR;
    if (va > vb) return 1 * BILLS_SORT_DIR;
    return 0;
  });

  var filtered = q ? allBills.filter(function (b) {
    return (b.order.invoiceNum || '').toLowerCase().indexOf(q) !== -1 ||
      (b.customer.name || '').toLowerCase().indexOf(q) !== -1 ||
      (b.order.verificationId || '').toLowerCase().indexOf(q) !== -1;
  }) : allBills;

  if (!filtered.length) {
    listEl.className = '';
    listEl.innerHTML = '<div class="cust-empty"><div class="icon">' + (q ? '🔍' : '📜') + '</div><p>' + (q ? 'No bills match "' + esc(q) + '"' : 'No bills saved yet.<br/>Generate and save a bill to see it here.') + '</p></div>';
    return;
  }

  listEl.className = 'bills-grid';
  listEl.innerHTML = filtered.map(function (b) {
    return '<div class="bill-tile" onclick="viewArchivedBill(\'' + b.customer.id + '\', \'' + b.order.invoiceNum + '\')">' +
      '<div class="bill-tile-icon">🧾</div>' +
      '<div class="bill-tile-inv">' + esc(b.order.invoiceNum) + '</div>' +
      '<div class="bill-tile-name">' + esc(b.customer.name) + '</div>' +
      '<div class="bill-tile-date">' + fmtDate(b.order.date) + '</div>' +
      '</div>';
  }).join('');
}

function buildBillHtml(order, customer) {
  var subtotal = 0;
  var rows = (order.items || []).map(function (it, i) {
    subtotal += it.total;
    return '<tr><td style="color:#bbb;font-size:.73rem;">' + (i + 1) + '</td>' +
      '<td style="text-align:left;"><div class="td-n">' + esc(it.name) + '</div><div class="td-c">' + esc(it.category) + '</div></td>' +
      '<td>' + it.qty + '</td><td>' + fmt(it.unitPrice) + '</td><td class="td-a">' + fmt(it.total) + '</td></tr>';
  });

  var adjustments = order.grand - subtotal;
  var adjHtml = '';
  if (Math.abs(adjustments) > 0.01) {
    adjHtml = '<div class="t-row"><span class="tl">Adjustments (GST/Discount/Delivery)</span><span class="tv">' + fmt(adjustments) + '</span></div>';
  }

  var ch = '<span class="bld">' + esc(customer.name || '—') + '</span>';
  if (customer.address) ch += '<br>' + esc(customer.address);
  if (customer.city) ch += '<br>' + esc(customer.city);
  if (customer.phone) ch += '<br>' + esc(customer.phone);

  var sAddr = gv('s-addr') || '';
  var sPhone = gv('s-phone') || '';
  var sGST = gv('s-gst') || '';
  var coInfo = esc([sAddr, sPhone].filter(Boolean).join(' | '));
  var gstinStr = sGST ? esc('GSTIN: ' + sGST) : '';

  var orderForHtml = '<div class="b-mb"><div class="b-ml">Order For</div><div class="b-mv">Premium Sarees &amp; Home Linens</div>' +
    '<div style="font-size:.7rem;color:var(--tl);margin-top:4px;">' + gstinStr + '</div></div>';
  var noteHtml = order.notes ? esc(order.notes).replace(/\n/g, '<br/>') : 'Thank you for your business!';

  return '<div class="b-hdr"><div class="b-hdr-l"><div class="b-logo"><img src="assets/ps-logo-compressed.png" alt="PS" onerror="this.style.display=\'none\'"/></div>' +
    '<div><div class="b-co-name">Parinay Saree</div><div class="b-co-tag">Weave Your World in Elegance</div>' +
    '<div class="b-co-info">' + coInfo + '</div></div></div>' +
    '<div class="b-hdr-r"><div class="b-inv-lbl">Invoice</div><div class="b-inv-num">#' + esc(order.invoiceNum) + '</div><div class="b-inv-dt">' + fmtDate(order.date) + '</div></div></div>' +
    '<div class="b-gold"></div>' +
    '<div class="b-meta"><div class="b-mb"><div class="b-ml">Bill To</div><div class="b-mv">' + ch + '</div></div>' + orderForHtml + '</div>' +
    '<table class="b-tbl"><thead><tr><th>#</th><th style="text-align:left;width:99%">Item Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>' +
    '<tbody>' + rows.join('') + '</tbody></table>' +
    '<div class="b-totals"><div class="tot-inner"><div class="t-row"><span class="tl">Subtotal</span><span class="tv">' + fmt(subtotal) + '</span></div>' +
    adjHtml +
    '<div class="t-grand"><span class="gl">Total Amount</span><span class="gv">' + fmt(order.grand) + '</span></div></div></div>' +
    '<div class="b-ftr"><div class="b-ftr-ty" style="text-transform:none; letter-spacing:normal; font-size:.86rem; border-top:none; padding:0; text-align:center;">' + noteHtml + '</div>' +
    '<div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:12px;">' +
    '<div class="b-ver-id" style="text-align:left; margin-top:0;">' + esc(order.verificationId || '') + '</div>' +
    '<div class="b-ftr-note" style="margin-bottom:0; text-align:right;"><strong>Parinay Saree</strong><br/>Contact: <strong>+91 98765 43210</strong></div></div></div><div class="b-strip"></div>';
}

function viewArchivedBill(custId, invNum) {
  var db = loadCustomers();
  var c = db.customers.find(function (c) { return c.id === custId; });
  if (!c) return;
  var o = (c.orders || []).find(function (o) { return o.invoiceNum === invNum; });
  if (!o) return;

  var html = buildBillHtml(o, c);
  document.getElementById('bill-view-content').innerHTML = html;

  document.getElementById('bv-edit-btn').onclick = function () { closeBillView(); closeBillsModal(); loadBillForEditing(custId, invNum); };
  document.getElementById('bv-share-btn').onclick = function () { shareBillHtml(html, o, c); };
  document.getElementById('bv-del-btn').onclick = function () { closeBillView(); deleteBill(custId, invNum); };

  document.getElementById('bill-view-overlay').classList.add('open');
}
function closeBillView() { document.getElementById('bill-view-overlay').classList.remove('open'); }
function closeBillViewOnBg(e) { if (e.target === document.getElementById('bill-view-overlay')) closeBillView(); }

function deleteBill(custId, invNum) {
  if (!confirm('Delete bill ' + invNum + '?')) return;
  var db = loadCustomers();
  var c = db.customers.find(function (c) { return c.id === custId; });
  if (c) {
    var initialLen = (c.orders || []).length;
    c.orders = (c.orders || []).filter(function (o) { return o.invoiceNum !== invNum; });

    // Recalculate total spent
    c.totalSpent = 0;
    c.orders.forEach(function (o) { c.totalSpent += (o.grand || 0); });

    saveCustomers(db);
    renderBillsModal();
    toast('🗑 Bill ' + invNum + ' deleted', 'info');
  }
}

function loadBillForEditing(custId, invNum) {
  var db = loadCustomers();
  var c = db.customers.find(function (c) { return c.id === custId; });
  if (!c) return;
  var o = (c.orders || []).find(function (o) { return o.invoiceNum === invNum; });
  if (!o) return;

  function doLoad() {
    EDITING_BILL = { custId: custId, invNum: invNum };
    setSaveBtnLabel(true);
    document.getElementById('inv-num').value = o.invoiceNum;
    document.getElementById('inv-date').value = o.date;
    document.getElementById('c-name').value = c.name || '';
    document.getElementById('c-phone').value = c.phone || '';
    document.getElementById('c-city').value = c.city || '';
    document.getElementById('c-addr').value = c.address || '';
    document.getElementById('notes').value = o.notes || '';
    document.getElementById('gst-rate').value = '0';
    document.getElementById('disc-rate').value = '0';
    document.getElementById('delivery').value = '0';
    ITEMS = []; UID = 1;
    (o.items || []).forEach(function (it) {
      ITEMS.push({ uid: UID++, name: it.name, priceNum: it.unitPrice, qty: it.qty, category: it.category || 'Custom' });
    });
    updateClearBtn(); rebuildList(); render(); closeBillsModal();
    toast('✏️ Editing ' + invNum + ' — save to overwrite', 'info');
  }

  if (ITEMS.length) { showConfirm('Discard current bill and load ' + invNum + '?', doLoad); }
  else { doLoad(); }
}

// grand total calculator (pure)
function calcGrand() {
  var subtotal = 0;
  ITEMS.forEach(function (it) { subtotal += it.priceNum * it.qty; });
  var discR = parseFloat(gv('disc-rate')) || 0;
  var gstR = parseFloat(gv('gst-rate')) || 0;
  var deliv = parseFloat(gv('delivery')) || 0;
  var after = subtotal - subtotal * discR / 100;
  return after + after * gstR / 100 + deliv;
}

// ═══════════════════════════════════════════════
//  NEW BILL
// ═══════════════════════════════════════════════
function newBill() {
  if (ITEMS.length) {
    showConfirm('Start a new bill? Current data will be cleared.', _doNewBill);
    return;
  }
  _doNewBill();
}
function _doNewBill() {
  EDITING_BILL = null;
  setSaveBtnLabel(false);
  ITEMS = []; UID = 1;
  ['c-name', 'c-addr', 'c-phone', 'c-city', 'notes'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('gst-rate').value = '5';
  document.getElementById('disc-rate').value = '0';
  document.getElementById('delivery').value = '0';
  var lastNum = parseInt(localStorage.getItem('parinay_inv_num') || '999');
  document.getElementById('inv-num').value = 'INV-' + (lastNum + 1);
  document.getElementById('inv-date').value = todayStr();
  updateClearBtn();
  rebuildList();
  render();
}

// ═══════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════
function parsePrice(s) { return parseFloat(String(s || '').replace(/[^0-9.]/g, '')) || 0; }
function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function gv(id) { var el = document.getElementById(id); return el ? el.value : ''; }
function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
function showEl(id, v) { var el = document.getElementById(id); if (el) el.style.display = v ? '' : 'none'; }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function todayStr() {
  var d = new Date(Date.now() + TIME_OFFSET_MS);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
function fmtDate(ds) {
  try { return new Date(ds + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch (e) { return ds; }
}
function toast(msg, type) {
  var el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast' + (type ? ' ' + type : '');
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(function () { el.classList.remove('show'); }, 3200);
}

async function generateVerificationId() {
  var pin = window.SECRET_PIN;
  if (!pin) return 'VID-UNVERIFIED';
  var inv = gv('inv-num') || '';
  var date = gv('inv-date') || '';
  var cName = gv('c-name') || '';
  var grand = calcGrand();

  var payload = inv + '|' + date + '|' + cName + '|' + grand + '|' + pin;

  if (!window.crypto || !window.crypto.subtle) {
    return 'VID-UNVERIFIED';
  }

  var encoder = new TextEncoder();
  var data = encoder.encode(payload);
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  var hashHex = hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');

  // VID-DATE-8CHARHASH
  return 'VID-' + date.replace(/-/g, '') + '-' + hashHex.substring(0, 8).toUpperCase();
}

// ═══════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════
init();