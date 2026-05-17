const API = 'http://localhost:3000/api';
let allMedicines = [];
let categoryMap  = {};

// Auth
const storedUser = JSON.parse(localStorage.getItem('user'));
if (!storedUser || storedUser.role !== 'staff') window.location.href = '../../index.html';

// ── Status helpers ──────────────────────────────────────────────────────────

function getStatus(m) {
  const now   = new Date();
  const in30  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (m.expiration_date) {
    const exp = new Date(m.expiration_date);
    if (exp < now) return 'Expired';
    if (exp <= in30) return 'Expiring Soon';
  }
  if (m.quantity < 10) return 'Low Stock';
  return 'OK';
}

function statusPillHTML(status) {
  const map = {
    'OK':            { cls: 'status-ok',       dot: 'var(--green)'       },
    'Expiring Soon': { cls: 'status-expiring',  dot: 'var(--yellow-dark)' },
    'Low Stock':     { cls: 'status-low',       dot: '#c2410c'            },
    'Expired':       { cls: 'status-expired',   dot: '#b71c1c'            },
  };
  const s = map[status] || map['OK'];
  return `<span class="pill ${s.cls}"><span style="background:${s.dot};width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:4px;flex-shrink:0;"></span>${status}</span>`;
}

// ── Table rendering ─────────────────────────────────────────────────────────

function renderTable(data) {
  const tbody = document.getElementById('medicinesBody');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('medicineCount');

  count.textContent = `${data.length} item${data.length !== 1 ? 's' : ''} found`;

  if (!data.length) {
    tbody.innerHTML  = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = data.map(m => {
    const status  = getStatus(m);
    const expDate = m.expiration_date
      ? new Date(m.expiration_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
      : '—';
    const cat    = categoryMap[m.category_id] || '—';
    const noStock = m.quantity === 0;

    return `<tr>
      <td>
        <div class="td-medicine">
          <div class="med-icon-sm"><i class="bi bi-capsule-pill"></i></div>
          ${m.name}${m.strength ? `<span style="font-size:.75rem;color:var(--text-3);margin-left:4px;">${m.strength}</span>` : ''}
        </div>
      </td>
      <td style="color:var(--text-2);font-size:.84rem;">${cat}</td>
      <td class="td-qty">${m.quantity}</td>
      <td style="color:var(--text-3);font-size:.83rem;">${m.unit || '—'}</td>
      <td class="td-date">${expDate}</td>
      <td>${statusPillHTML(status)}</td>
      <td>
        <button class="btn-add-request"
                onclick="addToRequestCart(${m.id})"
                ${noStock ? 'disabled' : ''}
                title="${noStock ? 'Out of stock' : 'Add to request cart'}">
          <i class="bi bi-cart-plus-fill"></i> Add to Request
        </button>
      </td>
    </tr>`;
  }).join('');
}

// ── Filters ─────────────────────────────────────────────────────────────────

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

// ── Request Cart ─────────────────────────────────────────────────────────────

function getRequestCart() {
  return JSON.parse(localStorage.getItem('requestCart') || '[]');
}

function saveRequestCart(cart) {
  localStorage.setItem('requestCart', JSON.stringify(cart));
}

function addToRequestCart(id) {
  const m = allMedicines.find(x => x.id === id);
  if (!m) return;

  const cart     = getRequestCart();
  const existing = cart.find(x => x.id === id);

  if (existing) {
    showToast('Already in Cart', `${m.name} is already in your request cart.`, 'w');
  } else {
    cart.push({
      id:   m.id,
      name: m.name,
      unit: m.unit || '',
      qty:  1,
      note: ''
    });
    saveRequestCart(cart);
    showToast('Added to Request', `${m.name} added to your request cart.`, 's');
  }

  updateCartBadge();
}

function updateCartBadge() {
  const count  = getRequestCart().length;
  const badge  = document.getElementById('cartBadge');
  const sbadge = document.getElementById('sidebarCartBadge');

  if (badge) {
    badge.textContent   = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
  if (sbadge) {
    sbadge.textContent   = count;
    sbadge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
}

// ── Sidebar / Overlay ────────────────────────────────────────────────────────

const sidebarEl = document.getElementById('sidebar');
const overlayEl = document.getElementById('sidebarOverlay');
document.getElementById('menuToggle').addEventListener('click', () => {
  sidebarEl.classList.toggle('open');
  overlayEl.classList.toggle('show');
});
overlayEl.addEventListener('click', () => {
  sidebarEl.classList.remove('open');
  overlayEl.classList.remove('show');
});

// ── Toast ────────────────────────────────────────────────────────────────────

function showToast(title, msg, type = 's') {
  const icons = { s: 'bi-check-circle-fill', w: 'bi-exclamation-circle-fill', e: 'bi-x-circle-fill' };
  const stack = document.getElementById('toastStack');
  const el    = document.createElement('div');
  el.className = 'toast-item';
  el.innerHTML = `
    <div class="toast-ico ${type}"><i class="bi ${icons[type]}"></i></div>
    <div class="toast-body"><strong>${title}</strong><p>${msg}</p></div>
    <button class="toast-close" onclick="this.closest('.toast-item').remove()"><i class="bi bi-x"></i></button>
  `;
  stack.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 4000);
}

// ── Load data ────────────────────────────────────────────────────────────────

async function loadMedicines() {
  try {
    const [medsRes, catsRes] = await Promise.all([
      fetch(`${API}/medicines`),
      fetch(`${API}/categories`)
    ]);
    allMedicines = await medsRes.json();
    const cats   = await catsRes.json();

    categoryMap = {};
    cats.forEach(c => { categoryMap[c.id] = c.name; });

    // Populate category filter
    const sel = document.getElementById('categoryFilter');
    cats.forEach(c => {
      const opt   = document.createElement('option');
      opt.value   = c.name;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });

    applyFilters();
  } catch (err) {
    console.error('Failed to load medicines:', err);
    showToast('Error', 'Could not load medicines. Check your connection.', 'e');
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────

loadMedicines();
updateCartBadge();

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    sidebarEl.classList.remove('open');
    overlayEl.classList.remove('show');
  }
});
