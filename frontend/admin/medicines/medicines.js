const API = 'http://localhost:3000/api';
const sessionUser = JSON.parse(localStorage.getItem('user') || 'null');

let allMedicines = [];
let allCategories = [];
let categoryMap = {};
let selectedMedId = null;
let editId = null;
let submitting = false;
let currentViewId = null;

function getStatus(m) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let expired = false;
  let expiringSoon = false;
  if (m.expiration_date) {
    const exp = new Date(m.expiration_date);
    exp.setHours(0, 0, 0, 0);
    const days = (exp - today) / 86400000;
    if (days < 0) expired = true;
    else if (days <= 30) expiringSoon = true;
  }
  return { expired, expiringSoon, lowStock: m.isLowStock !== undefined ? m.isLowStock : m.quantity <= 10 };
}

function statusBadgesHTML(status) {
  const { expired, expiringSoon, lowStock } = status;
  if (!expired && !expiringSoon && !lowStock) {
    return `<span class="pill status-ok"><span class="status-dot" style="background:var(--green);"></span>OK</span>`;
  }
  const parts = [];
  if (expired) {
    parts.push(`<span class="pill status-expired"><span class="status-dot" style="background:#b71c1c;"></span>Expired</span>`);
  } else if (expiringSoon) {
    parts.push(`<span class="pill status-expiring"><span class="status-dot" style="background:var(--yellow-dark);"></span>Expiring Soon</span>`);
  }
  if (lowStock) {
    parts.push(`<span class="pill status-low"><span class="status-dot" style="background:#c2410c;"></span>Low Stock</span>`);
  }
  return parts.join('');
}

function renderTable(data) {
  const tbody = document.getElementById('medicinesBody');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('medicineCount');
  count.textContent = `${data.length} item${data.length !== 1 ? 's' : ''} found`;
  if (!data.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = data.map(m => {
    const status = getStatus(m);
    const expDate = m.expiration_date ? new Date(m.expiration_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
    const cat = categoryMap[m.category_id] || '—';
    const dosageForm = m.dosage_form || '—';
    const strength = m.strength || '—';
    return `
      <tr>
        <td><div class="td-medicine"><div class="med-icon-sm"><i class="bi bi-capsule-pill"></i></div>${m.name}</div></td>
        <td style="color:var(--text-2);font-size:.84rem;">${cat}</td>
        <td><span style="background:rgba(124,58,237,.1);color:#7c3aed;padding:3px 10px;border-radius:20px;font-size:.76rem;font-weight:700;white-space:nowrap;">${dosageForm}</span></td>
        <td style="color:var(--text-3);font-size:.83rem;">${strength}</td>
        <td class="td-qty">${m.quantity}</td>
        <td style="color:var(--text-3);font-size:.83rem;">${m.unit || '—'}</td>
        <td class="td-date">${expDate}</td>
        <td><div style="display:flex;gap:4px;flex-wrap:wrap;min-width:110px;">${statusBadgesHTML(status)}</div></td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn-tbl btn-use" onclick="openUseModal(${m.id})" ${m.quantity === 0 ? 'disabled style="opacity:.45;cursor:not-allowed;pointer-events:none;"' : ''}><i class="bi bi-box-arrow-right"></i> Use</button>
            <button class="btn-tbl btn-restock" onclick="addToRestockCart(${m.id})"><i class="bi bi-cart3-fill"></i> Add to Cart</button>
            <button class="btn-tbl btn-view" onclick="viewMedicine(${m.id})"><i class="bi bi-eye"></i> View</button>
            <button class="btn-tbl btn-del" onclick="openDeleteModal(${m.id})"><i class="bi bi-trash"></i> Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const cat = document.getElementById('categoryFilter').value;
  const stat = document.getElementById('statusFilter').value;
  const filtered = allMedicines.filter(m => {
    const catName = categoryMap[m.category_id] || '';
    const status = getStatus(m);
    let statusMatch = true;
    if (stat === 'OK')            statusMatch = !status.expired && !status.expiringSoon && !status.lowStock;
    else if (stat === 'Expiring Soon') statusMatch = status.expiringSoon;
    else if (stat === 'Low Stock')     statusMatch = status.lowStock;
    else if (stat === 'Expired')       statusMatch = status.expired;
    return (!q || m.name.toLowerCase().includes(q) || catName.toLowerCase().includes(q)) &&
           (!cat || catName === cat) &&
           statusMatch;
  });
  renderTable(filtered);
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);

// --- Dispense field validation helpers ---

const DISPENSE_FIELDS = ['usePatientName', 'useCourse', 'useSection', 'useIllness', 'customQtyInput'];

function setFieldError(id, hasError) {
  const el = document.getElementById(id);
  if (!el) return;
  if (hasError) {
    el.style.borderColor = 'var(--red, #c0392b)';
    el.style.boxShadow  = '0 0 0 3px rgba(192,57,43,.15)';
  } else {
    el.style.borderColor = '';
    el.style.boxShadow  = '';
  }
}

function clearAllFieldErrors() {
  DISPENSE_FIELDS.forEach(id => setFieldError(id, false));
}

function attachDispenseClearListeners() {
  DISPENSE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => setFieldError(id, false), { passive: true });
  });
}

// --- Use / Dispense modal ---

function openUseModal(id) {
  selectedMedId = id;
  submitting = false;
  document.getElementById('dispenseForm').reset();
  clearAllFieldErrors();
  const m = allMedicines.find(x => x.id === id);
  document.getElementById('useModalSub').textContent = `${m.name} — Available: ${m.quantity} ${m.unit || ''}`;
  const btn = document.querySelector('#dispenseForm button[type="submit"]');
  if (btn) {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.innerHTML = '<i class="bi bi-check-lg"></i> Dispense';
  }
  document.getElementById('useModal').classList.add('show');
}

function closeUseModal() {
  document.getElementById('useModal').classList.remove('show');
  selectedMedId = null;
  submitting = false;
  document.getElementById('dispenseForm').reset();
  clearAllFieldErrors();
  const btn = document.querySelector('#dispenseForm button[type="submit"]');
  if (btn) {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.innerHTML = '<i class="bi bi-check-lg"></i> Dispense';
  }
}

attachDispenseClearListeners();

document.getElementById('dispenseForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (submitting) return;

  const btn = this.querySelector('button[type="submit"]');

  const patient_name = document.getElementById('usePatientName').value.trim();
  const course       = document.getElementById('useCourse').value.trim();
  const section      = document.getElementById('useSection').value.trim();
  const illness      = document.getElementById('useIllness').value.trim();
  const qty          = parseInt(document.getElementById('customQtyInput').value, 10);

  // Validate and highlight invalid fields
  let hasError = false;
  if (!patient_name) { setFieldError('usePatientName', true); hasError = true; }
  if (!course)        { setFieldError('useCourse', true);      hasError = true; }
  if (!section)       { setFieldError('useSection', true);     hasError = true; }
  if (!illness)       { setFieldError('useIllness', true);     hasError = true; }
  if (!qty || qty < 1) { setFieldError('customQtyInput', true); hasError = true; }

  if (hasError) {
    showToast('Missing Fields', 'Please fill in all required patient details.', 'e');
    return;
  }

  const m = allMedicines.find(x => x.id === selectedMedId);
  if (qty > m.quantity) {
    setFieldError('customQtyInput', true);
    showToast('Insufficient Stock', `Only ${m.quantity} ${m.unit || ''} available.`, 'e');
    return;
  }

  submitting = true;
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '.75';
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;"><span class="spin-icon" style="width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .6s linear infinite;"></span> Dispensing…</span>';
  }

  try {
    const res = await fetch(`${API}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicine_id: selectedMedId,
        type: 'out',
        quantity: qty,
        patient_name,
        course,
        section,
        illness,
        user_id: sessionUser ? sessionUser.id : null
      })
    });
    if (res.ok) {
      showToast('Dispensed Successfully', `${qty} ${m.unit || ''} of ${m.name} dispensed to ${patient_name}.`, 's');
      closeUseModal();
      loadMedicines();
    } else {
      const err = await res.json();
      showToast('Error', err.error || 'Failed to dispense.', 'e');
    }
  } catch {
    showToast('Error', 'Network error. Please try again.', 'e');
  } finally {
    submitting = false;
    if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = '<i class="bi bi-check-lg"></i> Dispense'; }
  }
});

// --- View modal ---

function viewMedicine(id) {
  const m = allMedicines.find(x => x.id === id);
  if (!m) return;
  currentViewId = id;

  const cat     = categoryMap[m.category_id] || '—';
  const expDate = m.expiration_date
    ? new Date(m.expiration_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
  const status = getStatus(m);
  const statusLabels = [];
  if (status.expired) statusLabels.push('Expired');
  else if (status.expiringSoon) statusLabels.push('Expiring Soon');
  if (status.lowStock) statusLabels.push('Low Stock');
  if (!statusLabels.length) statusLabels.push('OK');

  document.getElementById('viewMedName').textContent       = m.name;
  document.getElementById('viewMedCategory').textContent   = cat;
  document.getElementById('viewMedQuantity').textContent   = m.quantity;
  document.getElementById('viewMedUnit').textContent       = m.unit || '—';
  document.getElementById('viewMedDosageForm').textContent = m.dosage_form || '—';
  document.getElementById('viewMedStrength').textContent   = m.strength || '—';
  document.getElementById('viewMedExpiration').textContent = expDate;
  document.getElementById('viewMedStatus').textContent     = statusLabels.join(', ');

  const descEl = document.getElementById('viewMedDescription');
  const descWrap = document.getElementById('viewMedDescriptionWrap');
  if (descEl) {
    const desc = (m.description || '').trim();
    descEl.textContent = desc || '—';
    if (descWrap) descWrap.style.display = desc ? '' : 'none';
  }

  const badge = document.getElementById('viewMedStatusBadge');
  badge.className = '';
  badge.style.cssText = 'display:inline-flex;gap:4px;flex-wrap:wrap;';
  badge.innerHTML = statusBadgesHTML(status);

  const overlay = document.getElementById('viewMedModal');
  overlay.classList.add('show');
  overlay.onclick = function(e) {
    if (e.target === overlay) closeViewModal();
  };
}

function closeViewModal() {
  document.getElementById('viewMedModal').classList.remove('show');
  currentViewId = null;
}

function editFromView() {
  const id = currentViewId;
  closeViewModal();
  if (id !== null) editMedicine(id);
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (document.getElementById('viewMedModal').classList.contains('show')) closeViewModal();
    if (document.getElementById('useModal').classList.contains('show')) closeUseModal();
    if (document.getElementById('restockCartModal').classList.contains('show')) closeRestockCart();
    if (document.getElementById('deleteModal').classList.contains('show')) closeDeleteModal();
    if (document.getElementById('addMedModal').classList.contains('show')) closeAddModal();
    if (document.getElementById('categoriesModal').classList.contains('show')) closeCategoriesModal();
  }
});

// --- Add / Edit medicine ---

function editMedicine(id) {
  const m = allMedicines.find(x => x.id === id);
  editId = id;
  document.getElementById('name').value            = m.name;
  document.getElementById('strength').value        = m.strength || '';
  document.getElementById('category_id').value     = m.category_id || '';
  document.getElementById('dosage_form').value     = m.dosage_form || '';
  document.getElementById('unit').value            = m.unit || '';
  document.getElementById('expiration_date').value = m.expiration_date || '';
  document.getElementById('description').value     = m.description || '';
  document.getElementById('medQuantityGroup').style.display = 'none';
  document.getElementById('medQuantity').removeAttribute('required');
  document.getElementById('addMedModal').classList.add('show');
}

function openAddModal() {
  editId = null;
  document.getElementById('addForm').reset();
  document.getElementById('medQuantityGroup').style.display = '';
  document.getElementById('medQuantity').setAttribute('required', '');
  document.getElementById('addMedModal').classList.add('show');
}
function closeAddModal() {
  editId = null;
  document.getElementById('addMedModal').classList.remove('show');
  document.getElementById('medQuantityGroup').style.display = '';
  document.getElementById('medQuantity').setAttribute('required', '');
}

document.getElementById('btnAddMedicine').addEventListener('click', openAddModal);

const DOSAGE_UNIT_MAP = {
  Tablet: 'pcs', Capsule: 'pcs',
  Syrup: 'ml', Suspension: 'ml', Drops: 'ml',
  Injection: 'vial', Ointment: 'tube'
};

document.getElementById('dosage_form').addEventListener('change', function () {
  this.style.borderColor = '';
  const mapped = DOSAGE_UNIT_MAP[this.value];
  if (mapped) document.getElementById('unit').value = mapped;
});

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });

function showToast(title, msg, type = 's') {
  const icons = { s: 'bi-check-circle-fill', w: 'bi-exclamation-circle-fill', e: 'bi-x-circle-fill' };
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.innerHTML = `
    <div class="toast-ico ${type}"><i class="bi ${icons[type]}"></i></div>
    <div class="toast-body"><strong>${title}</strong><p>${msg}</p></div>
    <button class="toast-close" onclick="this.closest('.toast-item').remove()"><i class="bi bi-x"></i></button>`;
  stack.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 4000);
}

// --- Categories ---

async function loadCategories() {
  const res = await fetch(`${API}/categories`);
  allCategories = await res.json();
  categoryMap = {};
  allCategories.forEach(c => { categoryMap[c.id] = c.name; });
  syncCategoryDropdowns();
}

function syncCategoryDropdowns() {
  const filterSel = document.getElementById('categoryFilter');
  filterSel.innerHTML = '<option value="">All Categories</option>' +
    allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

  const formSel = document.getElementById('category_id');
  if (formSel) {
    formSel.innerHTML = '<option value="">Select category…</option>' +
      allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
}

async function loadMedicines() {
  try {
    const res = await fetch(`${API}/medicines`);
    const data = await res.json();
    allMedicines = (Array.isArray(data) ? data : []).map(m => ({
      ...m,
      isLowStock: m.quantity <= 10,
      suggestedRestock: Math.max(0, 100 - m.quantity)
    }));
  } catch {
    allMedicines = [];
  }
  renderTable(allMedicines);
  applyFilters();
}

async function init() {
  await loadCategories();
  await loadMedicines();
  loadCart();
}

init();

// --- Restock Cart ---

let restockList = [];

function persistCart() {
  localStorage.setItem('requestCart', JSON.stringify(
    restockList.map(i => ({ id: i.id, name: i.name, unit: i.unit, qty: i.qty, note: i.note }))
  ));
  console.log('[Cart] Persisted', restockList.length, 'item(s) to localStorage');
}

function loadCart() {
  const saved = JSON.parse(localStorage.getItem('requestCart') || '[]');
  restockList = saved.map(item => {
    const m = allMedicines.find(x => x.id === item.id);
    return {
      id:           item.id,
      name:         item.name,
      currentStock: m ? m.quantity : 0,
      unit:         item.unit || (m ? m.unit || '' : ''),
      dosage_form:  m ? m.dosage_form || '—' : '—',
      strength:     m ? m.strength    || '—' : '—',
      category_id:  m ? m.category_id : null,
      suggestedQty: m ? (m.suggestedRestock > 0 ? m.suggestedRestock : 1) : 1,
      qty:          item.qty  || 1,
      note:         item.note || ''
    };
  });
  updateRestockCartBadge();
  console.log('[Cart] Loaded from localStorage:', restockList.length, 'item(s)');
}

function addToRestockCart(id) {
  const m = allMedicines.find(x => x.id === id);
  if (!m) return;
  const existing = restockList.find(x => x.id === id);
  if (existing) {
    showToast('Already in Cart', `${m.name} is already queued — edit its quantity in the cart.`, 'w');
    openRestockCart();
    return;
  }
  restockList.push({
    id:           m.id,
    name:         m.name,
    currentStock: m.quantity,
    unit:         m.unit || '',
    dosage_form:  m.dosage_form || '—',
    strength:     m.strength   || '—',
    category_id:  m.category_id,
    suggestedQty: m.suggestedRestock > 0 ? m.suggestedRestock : 1,
    qty:          m.suggestedRestock > 0 ? m.suggestedRestock : 1,
    note:         ''
  });
  persistCart();
  updateRestockCartBadge();
  showToast('Added to Cart', `${m.name} added to the restock cart.`, 's');
}

function updateCartQty(id, val) {
  const item = restockList.find(x => x.id === id);
  if (item) { item.qty = Math.max(1, parseInt(val) || 1); persistCart(); }
}

function updateCartNote(id, val) {
  const item = restockList.find(x => x.id === id);
  if (item) { item.note = (val || '').trim(); persistCart(); }
}

function removeFromRestockCart(id) {
  restockList = restockList.filter(x => x.id !== id);
  persistCart();
  updateRestockCartBadge();
  renderRestockCart();
}

function updateRestockCartBadge() {
  const badge = document.getElementById('restockCartBadge');
  if (badge) {
    badge.textContent   = restockList.length;
    badge.style.display = restockList.length > 0 ? 'inline-flex' : 'none';
  }
  const sub = document.getElementById('restockCartSub');
  if (sub) sub.textContent = restockList.length
    ? `${restockList.length} item${restockList.length !== 1 ? 's' : ''} queued for restock`
    : 'No items queued yet.';
}

function renderRestockCart() {
  const list  = document.getElementById('restockCartList');
  const empty = document.getElementById('restockCartEmpty');
  if (!restockList.length) {
    list.style.display  = 'none';
    list.innerHTML      = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.style.display  = 'flex';
  list.innerHTML = restockList.map(item => `
    <div style="display:flex;align-items:center;gap:10px;background:var(--bg);border:1.5px solid var(--border-light);border-radius:10px;padding:11px 13px;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;">
        <div style="font-size:.88rem;font-weight:700;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
        <div style="font-size:.74rem;color:var(--text-3);margin-top:2px;">
          Stock: <strong>${item.currentStock} ${item.unit}</strong>
          &nbsp;·&nbsp;Suggested: <strong style="color:#1d4ed8;">${item.suggestedQty} ${item.unit}</strong>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <input type="number" min="1" value="${item.qty}"
            title="Quantity to restock"
            style="width:72px;padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;font-size:.88rem;font-family:'Nunito',sans-serif;text-align:center;outline:none;background:var(--surface);color:var(--text-1);"
            onchange="updateCartQty(${item.id}, this.value)"
            oninput="updateCartQty(${item.id}, this.value)" />
          <input type="text" value="${item.note ? item.note.replace(/"/g, '&quot;') : ''}" placeholder="Note…"
            title="Optional note"
            style="width:120px;padding:5px 8px;border:1.5px solid var(--border);border-radius:8px;font-size:.76rem;font-family:'Nunito',sans-serif;outline:none;background:var(--surface);color:var(--text-1);"
            oninput="updateCartNote(${item.id}, this.value)" />
        </div>
        <button onclick="removeFromRestockCart(${item.id})"
          style="width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.82rem;background:rgba(192,57,43,.08);color:#c0392b;border:1px solid rgba(192,57,43,.18);cursor:pointer;transition:var(--transition);flex-shrink:0;"
          onmouseover="this.style.background='#c0392b';this.style.color='#fff';"
          onmouseout="this.style.background='rgba(192,57,43,.08)';this.style.color='#c0392b';">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function openRestockCart() {
  renderRestockCart();
  updateRestockCartBadge();
  document.getElementById('restockCartModal').classList.add('show');
}

function closeRestockCart() {
  document.getElementById('restockCartModal').classList.remove('show');
}


// --- Delete medicine ---

let deleteMedId = null;

function openDeleteModal(id) {
  deleteMedId = id;
  const m = allMedicines.find(x => x.id === id);
  document.getElementById('deleteMedName').textContent = m ? m.name : 'this medicine';
  document.getElementById('deleteModal').classList.add('show');
}
function closeDeleteModal() {
  deleteMedId = null;
  document.getElementById('deleteModal').classList.remove('show');
}
async function confirmDelete() {
  if (!deleteMedId) return;
  const m = allMedicines.find(x => x.id === deleteMedId);
  try {
    const res = await fetch(`${API}/medicines/${deleteMedId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      showToast('Error', err.error || 'Failed to delete.', 'e');
      return;
    }
    showToast('Medicine Deleted', `${m ? m.name : 'Medicine'} has been removed.`, 's');
    closeDeleteModal();
    loadMedicines();
  } catch {
    showToast('Error', 'Network error. Please try again.', 'e');
  }
}

// --- Add / Edit form submit ---

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name            = document.getElementById('name').value.trim();
  const strength        = document.getElementById('strength').value.trim() || null;
  const category_id     = Number(document.getElementById('category_id').value) || null;
  const dosage_form     = document.getElementById('dosage_form').value;
  const quantity        = Number(document.getElementById('medQuantity').value) || 0;
  const unit            = document.getElementById('unit').value || null;
  const expiration_date = document.getElementById('expiration_date').value || null;
  const description     = document.getElementById('description').value.trim() || null;

  if (!dosage_form) {
    showToast('Missing Field', 'Please select a dosage form.', 'e');
    document.getElementById('dosage_form').style.borderColor = 'var(--red)';
    return;
  }

  try {
    if (editId) {
      const res = await fetch(`${API}/medicines/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category_id, dosage_form, strength, unit, expiration_date, description })
      });
      if (!res.ok) { const err = await res.json(); showToast('Error', err.error || 'Failed to update.', 'e'); return; }
      closeAddModal();
      showToast('Medicine Updated', `${name} has been updated successfully.`, 's');
    } else {
      const res = await fetch(`${API}/medicines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category_id, dosage_form, strength, quantity, unit, expiration_date, description })
      });
      if (!res.ok) { const err = await res.json(); showToast('Error', err.error || 'Failed to add.', 'e'); return; }
      closeAddModal();
      showToast('Medicine Added', `${name} has been added successfully.`, 's');
    }
  } catch {
    showToast('Error', 'Network error. Please try again.', 'e');
    return;
  }

  await loadMedicines();
});

// --- Categories modal ---

function openCategoriesModal() {
  document.getElementById('addCategoryForm').reset();
  renderCategoryList();
  document.getElementById('categoriesModal').classList.add('show');
}

function closeCategoriesModal() {
  document.getElementById('categoriesModal').classList.remove('show');
}

function renderCategoryList() {
  const ul = document.getElementById('categoryList');
  if (!ul) return;
  if (!allCategories.length) {
    ul.innerHTML = '<li class="cat-empty"><i class="bi bi-tags"></i>No categories yet.</li>';
    return;
  }
  ul.innerHTML = allCategories.map(c => {
    const inUse = allMedicines.some(m => m.category_id === c.id);
    return `
      <li class="cat-list-item">
        <span class="cat-list-item-name">
          <i class="bi bi-tag-fill"></i>${c.name}
          ${inUse ? `<span style="font-size:.7rem;font-weight:700;color:var(--text-3);margin-left:4px;">(in use)</span>` : ''}
        </span>
        <button class="btn-cat-del" onclick="deleteCategory(${c.id})" title="Delete category"><i class="bi bi-trash"></i></button>
      </li>`;
  }).join('');
}

async function submitAddCategory(e) {
  e.preventDefault();
  const name = document.getElementById('newCategoryName').value.trim();
  if (!name) return;
  const res = await fetch(`${API}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (res.ok) {
    document.getElementById('addCategoryForm').reset();
    showToast('Category Added', `"${name}" has been added.`, 's');
    await loadCategories();
    renderCategoryList();
    loadMedicines();
  } else {
    const err = await res.json();
    showToast('Error', err.error || 'Failed to add category.', 'e');
  }
}

// --- RIS Generator ---

async function submitRequest() {
  if (!restockList.length) {
    showToast('Cart Empty', 'Add at least one medicine to submit a request.', 'w');
    return;
  }

  const btn = document.getElementById('cartRisBtn');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '.75';
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;"><span class="spin-icon" style="width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .6s linear infinite;"></span> Submitting…</span>';
  }

  try {
    const res = await fetch(`${API}/ris`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requested_by: sessionUser ? (sessionUser.name || sessionUser.username || 'Admin') : 'Admin',
        items: restockList.map(i => ({
          medicine_id: i.id,
          name:        i.name,
          quantity:    i.qty,
          unit:        i.unit || '',
          note:        i.note || ''
        }))
      })
    });

    if (!res.ok) {
      const err = await res.json();
      showToast('Error', err.error || 'Failed to submit request.', 'e');
      return;
    }

    restockList = [];
    persistCart();
    updateRestockCartBadge();
    closeRestockCart();
    showToast('Request Submitted', 'Request submitted successfully.', 's');
  } catch {
    showToast('Network Error', 'Could not submit request. Please try again.', 'e');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '';
      btn.innerHTML = '<i class="bi bi-file-earmark-text"></i> Submit Request';
    }
  }
}

async function deleteCategory(id) {
  const cat = allCategories.find(c => c.id === id);
  const catName = cat ? cat.name : 'this category';

  const inUse = allMedicines.some(m => m.category_id === id);
  if (inUse) {
    showToast('Cannot Delete', `"${catName}" is assigned to one or more medicines. Reassign them first.`, 'e');
    return;
  }

  if (!confirm(`Delete category "${catName}"?\nThis cannot be undone.`)) return;

  const res = await fetch(`${API}/categories/${id}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Category Deleted', `"${catName}" has been removed.`, 's');
    await loadCategories();
    renderCategoryList();
    loadMedicines();
  } else {
    const err = await res.json();
    showToast('Error', err.error || 'Failed to delete category.', 'e');
  }
}
