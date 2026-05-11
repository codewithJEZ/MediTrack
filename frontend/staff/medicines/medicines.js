const API = 'http://localhost:3000/api';
let allMedicines = [];
let categoryMap = {};
let selectedMedId = null;
let submitting = false;

const storedUser = JSON.parse(localStorage.getItem('user'));
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
      <td><button class="btn-tbl btn-use" onclick="openUseModal(${m.id})" ${m.quantity === 0 ? 'disabled style="opacity:.45;cursor:not-allowed;pointer-events:none;"' : ''}><i class="bi bi-box-arrow-right"></i> Use</button></td>
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
