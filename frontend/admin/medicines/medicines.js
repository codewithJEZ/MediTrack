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
  if (m.quantity <= 10) return 'Low Stock';
  if (m.expiration_date) {
    const days = (new Date(m.expiration_date) - new Date()) / 86400000;
    if (days <= 30) return 'Expiring Soon';
  }
  return 'OK';
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
    const statusClass = status === 'OK' ? 'status-ok' : status === 'Expiring Soon' ? 'status-expiring' : 'status-low';
    const dotColor = status === 'OK' ? 'var(--green)' : status === 'Expiring Soon' ? 'var(--yellow-dark)' : 'var(--red)';
    const expDate = m.expiration_date ? new Date(m.expiration_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
    const cat = categoryMap[m.category_id] || '—';
    return `
      <tr>
        <td><div class="td-medicine"><div class="med-icon-sm"><i class="bi bi-capsule-pill"></i></div>${m.name}</div></td>
        <td style="color:var(--text-2);font-size:.84rem;">${cat}</td>
        <td class="td-qty">${m.quantity}</td>
        <td style="color:var(--text-3);font-size:.83rem;">${m.unit || '—'}</td>
        <td class="td-date">${expDate}</td>
        <td>
          <span class="pill ${statusClass}">
            <span style="background:${dotColor};width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:4px;"></span>
            ${status}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn-tbl btn-use" onclick="openUseModal(${m.id})" ${m.quantity === 0 ? 'disabled style="opacity:.45;cursor:not-allowed;pointer-events:none;"' : ''}><i class="bi bi-box-arrow-right"></i> Use</button>
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
    return (!q || m.name.toLowerCase().includes(q) || catName.toLowerCase().includes(q)) &&
           (!cat || catName === cat) &&
           (!stat || status === stat);
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
  const status      = getStatus(m);
  const statusClass = status === 'OK' ? 'status-ok' : status === 'Expiring Soon' ? 'status-expiring' : 'status-low';
  const dotColor    = status === 'OK' ? 'var(--green)' : status === 'Expiring Soon' ? 'var(--yellow-dark)' : 'var(--red)';

  document.getElementById('viewMedName').textContent       = m.name;
  document.getElementById('viewMedCategory').textContent   = cat;
  document.getElementById('viewMedQuantity').textContent   = m.quantity;
  document.getElementById('viewMedUnit').textContent       = m.unit || '—';
  document.getElementById('viewMedExpiration').textContent = expDate;
  document.getElementById('viewMedStatus').textContent     = status;

  const descEl = document.getElementById('viewMedDescription');
  const descWrap = document.getElementById('viewMedDescriptionWrap');
  if (descEl) {
    const desc = (m.description || '').trim();
    descEl.textContent = desc || '—';
    if (descWrap) descWrap.style.display = desc ? '' : 'none';
  }

  const badge = document.getElementById('viewMedStatusBadge');
  badge.className = `pill ${statusClass}`;
  badge.innerHTML = `<span style="background:${dotColor};width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:4px;"></span>${status}`;

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
  document.getElementById('category_id').value     = m.category_id || '';
  document.getElementById('quantity').value        = m.quantity;
  document.getElementById('unit').value            = m.unit || '';
  document.getElementById('expiration_date').value = m.expiration_date || '';
  document.getElementById('description').value     = m.description || '';
  document.getElementById('addMedModal').classList.add('show');
}

function openAddModal() {
  editId = null;
  document.getElementById('addForm').reset();
  document.getElementById('addMedModal').classList.add('show');
}
function closeAddModal() {
  editId = null;
  document.getElementById('addMedModal').classList.remove('show');
}

document.getElementById('btnAddMedicine').addEventListener('click', openAddModal);

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
  const res = await fetch(`${API}/medicines`);
  allMedicines = await res.json();
  applyFilters();
}

async function init() {
  await loadCategories();
  await loadMedicines();
}

init();

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
  await fetch(`${API}/medicines/${deleteMedId}`, { method: 'DELETE' });
  const m = allMedicines.find(x => x.id === deleteMedId);
  showToast('Medicine Deleted', `${m ? m.name : 'Medicine'} has been removed.`, 's');
  closeDeleteModal();
  loadMedicines();
}

// --- Add / Edit form submit ---

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name            = document.getElementById('name').value.trim();
  const quantity        = document.getElementById('quantity').value;
  const unit            = document.getElementById('unit').value.trim();
  const expiration_date = document.getElementById('expiration_date').value;
  const category_id     = document.getElementById('category_id').value || null;
  const description     = document.getElementById('description').value.trim() || null;

  if (editId) {
    await fetch(`${API}/medicines/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, quantity: Number(quantity), unit, expiration_date, category_id, description })
    });
    closeAddModal();
    showToast('Medicine Updated', `${name} has been updated successfully.`, 's');
  } else {
    await fetch(`${API}/medicines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, quantity: Number(quantity), unit, expiration_date, category_id, description })
    });
    closeAddModal();
    showToast('Medicine Added', `${name} has been added successfully.`, 's');
  }

  loadMedicines();
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
