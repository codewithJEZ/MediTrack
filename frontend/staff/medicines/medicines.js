const API = 'http://localhost:3000/api';
let allMedicines = [];
let categoryMap = {};
let selectedMedId = null;
let submitting = false;

const storedUser = JSON.parse(localStorage.getItem('user'));
if (!storedUser || storedUser.role !== 'staff') window.location.href = '../../index.html';
const userName = storedUser ? storedUser.name : 'Staff User';
document.getElementById('sidebarUserName').textContent = userName;
document.getElementById('sidebarAvatarInitial').textContent = userName.charAt(0).toUpperCase();
document.getElementById('navUserName').textContent = userName;
document.getElementById('navAvatarInitial').textContent = userName.slice(0, 2).toUpperCase();

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
    const status      = getStatus(m);
    const statusClass = status === 'OK' ? 'status-ok' : status === 'Expiring Soon' ? 'status-expiring' : 'status-low';
    const dotColor    = status === 'OK' ? 'var(--green)' : status === 'Expiring Soon' ? 'var(--yellow-dark)' : 'var(--red)';
    const expDate     = m.expiration_date ? new Date(m.expiration_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
    const cat         = categoryMap[m.category_id] || '—';
    return `<tr>
      <td><div class="td-medicine"><div class="med-icon-sm"><i class="bi bi-capsule-pill"></i></div>${m.name}</div></td>
      <td style="color:var(--text-2);font-size:.84rem;">${cat}</td>
      <td class="td-qty">${m.quantity}</td>
      <td style="color:var(--text-3);font-size:.83rem;">${m.unit || '—'}</td>
      <td class="td-date">${expDate}</td>
      <td><span class="pill ${statusClass}"><span style="background:${dotColor};width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:4px;"></span>${status}</span></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn-tbl btn-use" onclick="openUseModal(${m.id})" ${m.quantity === 0 ? 'disabled style="opacity:.45;cursor:not-allowed;pointer-events:none;"' : ''}><i class="bi bi-box-arrow-right"></i> Use</button>
          <button class="btn-tbl btn-restock" onclick="addToStockInCart(${m.id})"><i class="bi bi-cart-plus-fill"></i> Add to Cart</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function applyFilters() {
  const q    = document.getElementById('searchInput').value.toLowerCase();
  const cat  = document.getElementById('categoryFilter').value;
  const stat = document.getElementById('statusFilter').value;
  const filtered = allMedicines.filter(m => {
    const catName = categoryMap[m.category_id] || '';
    const status  = getStatus(m);
    return (!q    || m.name.toLowerCase().includes(q) || catName.toLowerCase().includes(q)) &&
           (!cat  || catName === cat) &&
           (!stat || status === stat);
  });
  renderTable(filtered);
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);

function openUseModal(id) {
  selectedMedId = id;
  document.getElementById('dispenseForm').reset();
  const m = allMedicines.find(x => x.id === id);
  document.getElementById('useModalSub').textContent = `${m.name} — Available: ${m.quantity} ${m.unit || ''}`;
  const btn = document.querySelector('#dispenseForm button[type="submit"]');
  if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  document.getElementById('useModal').classList.add('show');
}

function closeUseModal() {
  document.getElementById('useModal').classList.remove('show');
  selectedMedId = null;
  submitting = false;
  document.getElementById('dispenseForm').reset();
}

async function confirmUse(e) {
  if (e) e.preventDefault();
  if (submitting) return;

  const btn = document.querySelector('#dispenseForm button[type="submit"]');
  submitting = true;
  if (btn) { btn.disabled = true; btn.style.opacity = '.6'; }

  const patient_name = document.getElementById('usePatientName').value.trim();
  const course       = document.getElementById('useCourse').value.trim();
  const section      = document.getElementById('useSection').value.trim();
  const illness      = document.getElementById('useIllness').value.trim();
  const qty          = parseInt(document.getElementById('customQtyInput').value, 10);

  if (!patient_name || !course || !section || !illness) {
    showToast('Error', 'Please fill in all patient details.', 'e');
    submitting = false;
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    return;
  }
  if (!qty || qty < 1) {
    showToast('Error', 'Please enter a valid quantity.', 'e');
    submitting = false;
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    return;
  }

  const m = allMedicines.find(x => x.id === selectedMedId);
  if (qty > m.quantity) {
    showToast('Insufficient Stock', `Only ${m.quantity} ${m.unit || ''} available.`, 'e');
    submitting = false;
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    return;
  }

  try {
    const res = await fetch(`${API}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicine_id: selectedMedId, type: 'out', quantity: qty, patient_name, course, section, illness })
    });
    if (res.ok) {
      showToast('Dispensed', `${qty} ${m.unit || ''} of ${m.name} dispensed to ${patient_name}.`, 's');
      closeUseModal();
      loadMedicines();
    } else {
      const err = await res.json();
      showToast('Error', err.error || 'Failed to dispense.', 'e');
    }
  } finally {
    submitting = false;
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  }
}

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });

document.getElementById('btnLogout').addEventListener('click', () => {
  localStorage.removeItem('user');
  window.location.href = '../../index.html';
});

function showToast(title, msg, type = 's') {
  const icons = { s: 'bi-check-circle-fill', w: 'bi-exclamation-circle-fill', e: 'bi-x-circle-fill' };
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.innerHTML = `<div class="toast-ico ${type}"><i class="bi ${icons[type]}"></i></div><div class="toast-body"><strong>${title}</strong><p>${msg}</p></div><button class="toast-close" onclick="this.closest('.toast-item').remove()"><i class="bi bi-x"></i></button>`;
  stack.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 4000);
}

async function loadMedicines() {
  const [medsRes, catsRes] = await Promise.all([fetch(`${API}/medicines`), fetch(`${API}/categories`)]);
  allMedicines = await medsRes.json();
  const cats = await catsRes.json();
  categoryMap = {};
  cats.forEach(c => { categoryMap[c.id] = c.name; });
  applyFilters();
}

loadMedicines();

// --- Stock In Cart (staff only) ---

let stockInList = [];

function addToStockInCart(id) {
  const m = allMedicines.find(x => x.id === id);
  if (!m) return;
  const existing = stockInList.find(x => x.id === id);
  if (existing) {
    showToast('Already in Cart', `${m.name} is already in the cart — adjust its quantity inside.`, 'w');
    openStockInCart();
    return;
  }
  stockInList.push({ id: m.id, name: m.name, currentStock: m.quantity, unit: m.unit || '', qty: 1, note: '' });
  updateStockInBadge();
  showToast('Added to Cart', `${m.name} added to the stock-in cart.`, 's');
}

function updateStockInCartQty(id, val) {
  const item = stockInList.find(x => x.id === id);
  if (item) item.qty = Math.max(1, parseInt(val) || 1);
}

function updateStockInCartNote(id, val) {
  const item = stockInList.find(x => x.id === id);
  if (item) item.note = (val || '').trim();
}

function removeFromStockInCart(id) {
  stockInList = stockInList.filter(x => x.id !== id);
  updateStockInBadge();
  renderStockInCart();
}

function updateStockInBadge() {
  const badge = document.getElementById('stockInCartBadge');
  if (badge) {
    badge.textContent = stockInList.length;
    badge.style.display = stockInList.length > 0 ? 'inline-flex' : 'none';
  }
  const sub = document.getElementById('stockInCartSub');
  if (sub) sub.textContent = stockInList.length
    ? `${stockInList.length} item${stockInList.length !== 1 ? 's' : ''} queued for stock-in`
    : 'No items queued yet.';
}

function renderStockInCart() {
  const list  = document.getElementById('stockInCartList');
  const empty = document.getElementById('stockInCartEmpty');
  if (!stockInList.length) {
    list.style.display  = 'none';
    list.innerHTML      = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.style.display  = 'flex';
  list.innerHTML = stockInList.map(item => `
    <div style="display:flex;align-items:center;gap:10px;background:var(--bg);border:1.5px solid var(--border-light);border-radius:10px;padding:11px 13px;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;">
        <div style="font-size:.88rem;font-weight:700;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
        <div style="font-size:.74rem;color:var(--text-3);margin-top:2px;">
          Current Stock: <strong>${item.currentStock} ${item.unit}</strong>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <input type="number" min="1" value="${item.qty}"
            title="Quantity to stock in"
            style="width:72px;padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;font-size:.88rem;font-family:'Nunito',sans-serif;text-align:center;outline:none;background:var(--surface);color:var(--text-1);"
            onchange="updateStockInCartQty(${item.id}, this.value)"
            oninput="updateStockInCartQty(${item.id}, this.value)" />
          <input type="text" value="${item.note ? item.note.replace(/"/g, '&quot;') : ''}" placeholder="Note…"
            title="Optional note"
            style="width:120px;padding:5px 8px;border:1.5px solid var(--border);border-radius:8px;font-size:.76rem;font-family:'Nunito',sans-serif;outline:none;background:var(--surface);color:var(--text-1);"
            oninput="updateStockInCartNote(${item.id}, this.value)" />
        </div>
        <button onclick="removeFromStockInCart(${item.id})"
          style="width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.82rem;background:rgba(192,57,43,.08);color:#c0392b;border:1px solid rgba(192,57,43,.18);cursor:pointer;flex-shrink:0;"
          onmouseover="this.style.background='#c0392b';this.style.color='#fff';"
          onmouseout="this.style.background='rgba(192,57,43,.08)';this.style.color='#c0392b';">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function openStockInCart() {
  renderStockInCart();
  updateStockInBadge();
  document.getElementById('stockInCartModal').classList.add('show');
}

function closeStockInCart() {
  document.getElementById('stockInCartModal').classList.remove('show');
}

async function confirmDelivery() {
  if (!stockInList.length) {
    showToast('Cart Empty', 'Add at least one medicine to the cart first.', 'w');
    return;
  }
  const btn = document.getElementById('confirmDeliveryBtn');
  btn.disabled = true;
  btn.style.opacity = '.75';
  btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .6s linear infinite;"></span> Submitting…</span>';

  try {
    const res = await fetch(`${API}/ris`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requested_by: storedUser ? (storedUser.name || storedUser.username || 'Staff') : 'Staff',
        items: stockInList.map(i => ({ medicine_id: i.id, quantity: i.qty, unit: i.unit || null }))
      })
    });
    if (res.ok) {
      showToast('RIS Submitted', `Restock request created for ${stockInList.length} item${stockInList.length !== 1 ? 's' : ''}. Awaiting admin approval.`, 's');
      stockInList = [];
      updateStockInBadge();
      closeStockInCart();
    } else {
      const err = await res.json();
      showToast('Error', err.error || 'Failed to submit RIS.', 'e');
    }
  } catch {
    showToast('Error', 'Network error. Please try again.', 'e');
  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.innerHTML = '<i class="bi bi-file-earmark-text"></i> Generate RIS';
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (document.getElementById('stockInCartModal').classList.contains('show')) closeStockInCart();
    if (document.getElementById('useModal').classList.contains('show')) closeUseModal();
  }
});
