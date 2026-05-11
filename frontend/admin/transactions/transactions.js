const API = 'http://localhost:3000/api';
let allTransactions = [];
let activeFilter = 'All';
let pendingDeleteTxId = null;

function computeSummary() {
  document.getElementById('sumTotal').textContent = allTransactions.length;
  document.getElementById('sumIn').textContent    = allTransactions.filter(t => (t.type || '').toUpperCase() === 'IN').length;
  document.getElementById('sumOut').textContent   = allTransactions.filter(t => (t.type || '').toUpperCase() === 'OUT').length;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

function renderTx(data) {
  const tbody = document.getElementById('txBody');
  document.getElementById('txCount').textContent = `${data.length} record${data.length !== 1 ? 's' : ''}`;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:44px;color:var(--text-3);font-size:.88rem;">No records found.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.slice().reverse().map(t => {
    const isIn      = (t.type || '').toUpperCase() === 'IN';
    const dt        = formatDate(t.created_at);
    const tm        = formatTime(t.created_at);
    const medName   = t.medicine_name || `ID ${t.medicine_id || '—'}`;
    const patient   = t.patient_name  || '';
    const course    = t.course        || '';
    const section   = t.section       || '';
    const illness   = t.illness       || '';
    const performer = t.performed_by  || '';
    const infoLine  = [course, section].filter(Boolean).join(' · ');

    return `
      <tr>
        <td>
          <div style="font-weight:700;color:var(--text-1);font-size:.88rem;">${patient || '—'}</div>
          ${infoLine ? `<div style="font-size:.76rem;color:var(--text-3);margin-top:2px;">${infoLine}</div>` : ''}
        </td>
        <td style="color:var(--text-2);font-size:.84rem;">${illness || '—'}</td>
        <td><div class="td-medicine"><div class="med-icon-sm"><i class="bi bi-capsule-pill"></i></div>${medName}</div></td>
        <td class="td-qty">${t.quantity != null ? t.quantity : '—'}</td>
        <td>
          <span class="pill ${isIn ? 'type-in' : 'type-out'}">
            <i class="bi ${isIn ? 'bi-box-arrow-in-down' : 'bi-box-arrow-right'}" style="margin-right:3px;"></i>
            ${isIn ? 'Stock In' : 'Dispensed'}
          </span>
        </td>
        <td class="td-date">
          ${dt}
          ${tm ? `<div style="font-size:.72rem;color:var(--text-3);margin-top:1px;">${tm}</div>` : ''}
          ${performer ? `<div style="font-size:.72rem;color:var(--text-3);margin-top:3px;"><i class="bi bi-person-fill" style="margin-right:2px;"></i>${performer}</div>` : ''}
        </td>
        <td>
          <button
            class="btn-delete"
            onclick="handleDeleteTransaction(${t.id})"
            title="Delete transaction">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>`;
  }).join('');
}

function handleDeleteTransaction(id) {
  const numId = Number(id);
  if (!id || !Number.isInteger(numId) || numId <= 0) {
    console.error('[Delete] Invalid transaction ID:', id);
    showToast('Error', 'Invalid transaction ID. Cannot delete.', 'e');
    return;
  }
  console.log('[Delete] Opening modal for transaction ID:', numId);
  pendingDeleteTxId = numId;
  document.getElementById('deleteTxModal').classList.add('show');
}

function closeDeleteTxModal() {
  pendingDeleteTxId = null;
  document.getElementById('deleteTxModal').classList.remove('show');
}

async function confirmDeleteTransaction() {
  if (!pendingDeleteTxId) {
    console.warn('[Delete] confirmDeleteTransaction called with no pending ID');
    return;
  }
  const id = pendingDeleteTxId;
  console.log('[Delete] Confirming delete for transaction ID:', id);
  closeDeleteTxModal();
  try {
    const res = await fetch(`${API}/transactions/${id}`, { method: 'DELETE' });
    console.log('[Delete] Response status:', res.status);
    if (res.ok) {
      showToast('Deleted', 'Transaction has been removed successfully.', 's');
      await loadTransactions();
    } else {
      const err = await res.json().catch(() => ({}));
      console.error('[Delete] Error response:', err);
      showToast('Error', err.error || 'Failed to delete transaction.', 'e');
    }
  } catch (e) {
    console.error('[Delete] Network error:', e);
    showToast('Error', 'Network error. Please try again.', 'e');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Confirm button already has onclick in HTML; this guards against any future removal of that attribute
  const confirmBtn = document.getElementById('btnConfirmDeleteTx');
  if (confirmBtn && !confirmBtn.getAttribute('onclick')) {
    confirmBtn.addEventListener('click', confirmDeleteTransaction);
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('deleteTxModal');
    if (modal && modal.classList.contains('show')) closeDeleteTxModal();
  }
});

function applyFilters() {
  const q        = document.getElementById('searchInput').value.toLowerCase();
  const fromVal  = document.getElementById('dateFrom').value;
  const toVal    = document.getElementById('dateTo').value;
  const fromDate = fromVal ? new Date(fromVal) : null;
  const toDate   = toVal   ? new Date(toVal + 'T23:59:59') : null;

  const data = allTransactions.filter(t => {
    const med       = (t.medicine_name  || '').toLowerCase();
    const patient   = (t.patient_name   || '').toLowerCase();
    const course    = (t.course         || '').toLowerCase();
    const section   = (t.section        || '').toLowerCase();
    const illness   = (t.illness        || '').toLowerCase();
    const performer = (t.performed_by   || '').toLowerCase();
    const txDate    = t.created_at ? new Date(t.created_at) : null;
    return (activeFilter === 'All' || (t.type || '').toUpperCase() === activeFilter) &&
           (!q || med.includes(q) || patient.includes(q) || course.includes(q) || section.includes(q) || illness.includes(q) || performer.includes(q)) &&
           (!fromDate || (txDate && txDate >= fromDate)) &&
           (!toDate   || (txDate && txDate <= toDate));
  });
  renderTx(data);
}

function clearDateFilter() {
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value   = '';
  applyFilters();
}

document.getElementById('filterTabs').addEventListener('click', e => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  tab.classList.add('active');
  activeFilter = tab.dataset.filter;
  applyFilters();
});
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('dateFrom').addEventListener('change', applyFilters);
document.getElementById('dateTo').addEventListener('change', applyFilters);

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });

function showToast(title, msg, type = 's') {
  const icons = { s: 'bi-check-circle-fill', w: 'bi-exclamation-circle-fill', e: 'bi-x-circle-fill' };
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.innerHTML = `<div class="toast-ico ${type}"><i class="bi ${icons[type]}"></i></div><div class="toast-body"><strong>${title}</strong><p>${msg}</p></div><button class="toast-close" onclick="this.closest('.toast-item').remove()"><i class="bi bi-x"></i></button>`;
  stack.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 4000);
}

async function loadTransactions() {
  try {
    const res = await fetch(`${API}/transactions`);
    allTransactions = await res.json();
    computeSummary();
    applyFilters();
  } catch {
    showToast('Error', 'Failed to load transactions.', 'e');
  }
}

loadTransactions();
