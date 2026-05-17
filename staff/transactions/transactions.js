const API = 'http://localhost:3000/api';
let allTransactions = [];
let activeFilter = 'All';

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
    const performer = t.performed_by  || '';

    let primaryLabel, secondaryLine, illnessCell;
    if (isIn) {
      primaryLabel  = `<span style="font-weight:700;color:#15803d;font-size:.88rem;">Restock</span>`;
      secondaryLine = t.notes ? `<div style="font-size:.76rem;color:var(--text-3);margin-top:2px;">${t.notes}</div>` : '';
      illnessCell   = `<span style="color:var(--text-3);font-size:.84rem;">—</span>`;
    } else {
      const patient  = t.patient_name || '';
      const course   = t.course       || '';
      const section  = t.section      || '';
      const illness  = t.illness      || '';
      const infoLine = [course, section].filter(Boolean).join(' · ');
      primaryLabel  = `<div style="font-weight:700;color:var(--text-1);font-size:.88rem;">${patient || '—'}</div>`;
      secondaryLine = infoLine ? `<div style="font-size:.76rem;color:var(--text-3);margin-top:2px;">${infoLine}</div>` : '';
      illnessCell   = `<span style="color:var(--text-2);font-size:.84rem;">${illness || '—'}</span>`;
    }

    return `
      <tr>
        <td>
          ${primaryLabel}
          ${secondaryLine}
        </td>
        <td>${illnessCell}</td>
        <td><div class="td-medicine"><div class="med-icon-sm"><i class="bi bi-capsule-pill"></i></div>${medName}</div></td>
        <td class="td-qty">${t.quantity != null ? t.quantity : '—'}</td>
        <td>
          <span class="pill ${isIn ? 'type-in' : 'type-out'}">
            <i class="bi ${isIn ? 'bi-box-arrow-in-down' : 'bi-box-arrow-right'}" style="margin-right:3px;"></i>
            ${isIn ? 'Restocked' : 'Dispensed'}
          </span>
        </td>
        <td class="td-date">
          ${dt}
          ${tm ? `<div style="font-size:.72rem;color:var(--text-3);margin-top:1px;">${tm}</div>` : ''}
          ${performer ? `<div style="font-size:.72rem;color:var(--text-3);margin-top:3px;"><i class="bi bi-person-fill" style="margin-right:2px;"></i>${performer}</div>` : ''}
        </td>
        <td>
          <button class="btn-tbl btn-view" onclick="openViewTxModal(${t.id})"><i class="bi bi-eye"></i> View</button>
        </td>
      </tr>`;
  }).join('');
}

function openViewTxModal(id) {
  const t = allTransactions.find(x => x.id === id);
  if (!t) return;

  const isIn = (t.type || '').toUpperCase() === 'IN';

  const iconWrap = document.getElementById('viewTxIconWrap');
  iconWrap.style.background = isIn
    ? 'linear-gradient(135deg,#16a34a,#22c55e)'
    : 'linear-gradient(135deg,var(--maroon),var(--maroon-light))';

  document.getElementById('viewTxIcon').className = `bi ${isIn ? 'bi-box-arrow-in-down' : 'bi-box-arrow-right'}`;
  document.getElementById('viewTxTitle').textContent = isIn ? 'Restocked' : 'Dispensed';
  document.getElementById('viewTxBadge').innerHTML = `
    <span class="pill ${isIn ? 'type-in' : 'type-out'}">
      <i class="bi ${isIn ? 'bi-box-arrow-in-down' : 'bi-box-arrow-right'}" style="margin-right:3px;"></i>
      ${isIn ? 'Restocked' : 'Dispensed'}
    </span>`;

  document.getElementById('vtxMedicine').textContent  = t.medicine_name || `ID ${t.medicine_id || '—'}`;
  document.getElementById('vtxQuantity').textContent  = t.quantity != null ? t.quantity : '—';
  document.getElementById('vtxDate').textContent      = `${formatDate(t.created_at)} ${formatTime(t.created_at)}`;
  document.getElementById('vtxPerformer').textContent = t.performed_by || '—';

  const show = elId => { document.getElementById(elId).style.display = ''; };
  const hide = elId => { document.getElementById(elId).style.display = 'none'; };

  if (isIn) {
    hide('vtxPatientWrap'); hide('vtxCourseWrap'); hide('vtxSectionWrap'); hide('vtxIllnessWrap');
    show('vtxNoteWrap');
    document.getElementById('vtxNote').textContent = t.notes || '—';
  } else {
    show('vtxPatientWrap'); show('vtxCourseWrap'); show('vtxSectionWrap'); show('vtxIllnessWrap');
    hide('vtxNoteWrap');
    document.getElementById('vtxPatient').textContent  = t.patient_name || '—';
    document.getElementById('vtxCourse').textContent   = t.course       || '—';
    document.getElementById('vtxSection').textContent  = t.section      || '—';
    document.getElementById('vtxIllness').textContent  = t.illness      || '—';
  }

  document.getElementById('viewTxModal').classList.add('show');
}

function closeViewTxModal() {
  document.getElementById('viewTxModal').classList.remove('show');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('viewTxModal').classList.contains('show')) {
    closeViewTxModal();
  }
});

function applyFilters() {
  const q        = document.getElementById('searchInput').value.toLowerCase();
  const fromVal  = document.getElementById('dateFrom').value;
  const toVal    = document.getElementById('dateTo').value;
  const fromDate = fromVal ? new Date(fromVal + 'T00:00:00') : null;
  const toDate   = toVal   ? new Date(toVal   + 'T23:59:59') : null;

  const data = allTransactions.filter(t => {
    const med       = (t.medicine_name || '').toLowerCase();
    const patient   = (t.patient_name  || '').toLowerCase();
    const course    = (t.course        || '').toLowerCase();
    const section   = (t.section       || '').toLowerCase();
    const illness   = (t.illness       || '').toLowerCase();
    const performer = (t.performed_by  || '').toLowerCase();
    const txDate    = t.created_at ? new Date(t.created_at.replace(' ', 'T')) : null;

    return (activeFilter === 'All' || (t.type || '').toUpperCase() === activeFilter) &&
           (!q || med.includes(q) || patient.includes(q) || course.includes(q) || section.includes(q) || illness.includes(q) || performer.includes(q)) &&
           (!fromDate || (txDate && txDate >= fromDate)) &&
           (!toDate   || (txDate && txDate <= toDate));
  });

  renderTx(data);
}

function clearDateFilter() {
  document.getElementById('searchInput').value = '';
  document.getElementById('dateFrom').value    = '';
  document.getElementById('dateTo').value      = '';
  activeFilter = 'All';
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  const allTab = document.querySelector('.filter-tab[data-filter="All"]');
  if (allTab) allTab.classList.add('active');
  loadTransactions();
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
    if (!res.ok) throw new Error('Server error');
    allTransactions = await res.json();
    computeSummary();
    applyFilters();
  } catch {
    showToast('Error', 'Failed to load transactions. Is the server running?', 'e');
  }
}

loadTransactions();
