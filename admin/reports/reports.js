Chart.defaults.font.family = "'Nunito', sans-serif";
Chart.defaults.color = '#8d93b0';

const usageChart = new Chart(document.getElementById('usageChart'), {
  type: 'bar',
  data: {
    labels: [],
    datasets: [
      { label: 'Dispensed', data: [], backgroundColor: '#7B1D1E', borderRadius: 6, barPercentage: .55 },
      { label: 'Restocked', data: [], backgroundColor: '#F6AC02', borderRadius: 6, barPercentage: .55 }
    ]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { grid: { color: '#eef0f6' }, border: { display: false }, ticks: { stepSize: 20 } }
    }
  }
});

const stockChart = new Chart(document.getElementById('stockChart'), {
  type: 'bar',
  data: { labels: [], datasets: [{ label: 'Dispensed', data: [], backgroundColor: [], borderRadius: 5, barPercentage: .65 }] },
  options: {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#eef0f6' }, border: { display: false } },
      y: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 12 } } }
    }
  }
});

const catDonut = new Chart(document.getElementById('categoryDonut'), {
  type: 'doughnut',
  data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0, hoverOffset: 6 }] },
  options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false } } }
});

const COLORS = ['#7B1D1E','#dc2626','#16a34a','#2563eb','#ea580c','#F6AC02','#8d93b0','#7c3aed'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

let _reportSnapshot = { meds: [], summary: {}, topMeds: [], monthly: [], recentTxns: [], fromDate: null, toDate: null };

async function loadReports(fromDate, toDate) {
  try {
    const qs = [];
    if (fromDate) qs.push(`from=${fromDate}`);
    if (toDate)   qs.push(`to=${toDate}`);
    const dateQuery = qs.length ? '?' + qs.join('&') : '';

    const [summaryRes, monthlyRes, topMedsRes, medsRes, catsRes, recentTxnsRes] = await Promise.all([
      fetch(`${API}/reports/summary${dateQuery}`),
      fetch(`${API}/reports/monthly${dateQuery}`),
      fetch(`${API}/reports/top-medicines${dateQuery}`),
      fetch(`${API}/medicines`),
      fetch(`${API}/categories`),
      fetch(`${API}/reports/recent-transactions`)
    ]);

    const summary    = await summaryRes.json();
    const monthly    = await monthlyRes.json();
    const topMeds    = await topMedsRes.json();
    const meds       = await medsRes.json();
    const cats       = await catsRes.json();
    const recentTxns = await recentTxnsRes.json();

    if (fromDate || toDate) {
      const label = fromDate && toDate ? `${fromDate} — ${toDate}` : fromDate ? `From ${fromDate}` : `Until ${toDate}`;
      document.getElementById('rptSubLabel').textContent = label;
    } else {
      document.getElementById('rptSubLabel').textContent = 'All transactions';
    }

    _reportSnapshot = { meds, summary, topMeds: Array.isArray(topMeds) ? topMeds : [], monthly: Array.isArray(monthly) ? monthly : [], recentTxns: Array.isArray(recentTxns) ? recentTxns : [], fromDate: fromDate || null, toDate: toDate || null };

    document.getElementById('rptStockIn').textContent     = summary.totalStockIn      ?? 0;
    document.getElementById('rptTotalTxn').textContent    = summary.totalTransactions  ?? 0;
    document.getElementById('rptStockOut').textContent    = summary.totalStockOut     ?? 0;
    document.getElementById('rptApprovedRIS').textContent = summary.approvedRIS       ?? 0;

    const sortedMonthly = Array.isArray(monthly) ? [...monthly].sort((a, b) => a.month.localeCompare(b.month)) : [];
    const recentMonths  = sortedMonthly.slice(-12);
    usageChart.data.labels = recentMonths.map(r => {
      const [, mo] = r.month.split('-');
      return MONTH_NAMES[parseInt(mo, 10) - 1] || r.month;
    });
    usageChart.data.datasets[0].data = recentMonths.map(r => r.stock_out || 0);
    usageChart.data.datasets[1].data = recentMonths.map(r => r.stock_in  || 0);
    usageChart.update();

    const safeTopMeds = Array.isArray(topMeds) ? topMeds : [];
    stockChart.data.labels = safeTopMeds.map(m => m.name);
    stockChart.data.datasets[0].data = safeTopMeds.map(m => m.total_dispensed || 0);
    stockChart.data.datasets[0].backgroundColor = safeTopMeds.map((_, i) => COLORS[i % COLORS.length]);
    stockChart.update();

    const catMap   = {};
    const safeCats = Array.isArray(cats) ? cats : [];
    const safeMeds = Array.isArray(meds) ? meds : [];
    safeCats.forEach(c => { catMap[c.id] = c.name; });
    const catCount = {};
    safeMeds.forEach(m => {
      const name = catMap[m.category_id] || 'Unknown';
      catCount[name] = (catCount[name] || 0) + 1;
    });
    const catEntries = Object.entries(catCount).map(([label, count], i) => ({ label, count, color: COLORS[i % COLORS.length] }));
    catDonut.data.labels = catEntries.map(c => c.label);
    catDonut.data.datasets[0].data = catEntries.map(c => c.count);
    catDonut.data.datasets[0].backgroundColor = catEntries.map(c => c.color);
    catDonut.update();
    document.getElementById('donutList').innerHTML = catEntries.map(c =>
      `<div class="donut-row">
        <div class="donut-left"><div class="donut-dot" style="background:${c.color};"></div><span class="donut-lbl">${c.label}</span></div>
        <span class="donut-val">${c.count}</span>
      </div>`
    ).join('');
  } catch (err) {
    console.error('loadReports error:', err);
  }
}

loadReports();

document.getElementById('btnFilter').addEventListener('click', () => {
  const from = document.getElementById('filterFrom').value;
  const to   = document.getElementById('filterTo').value;
  loadReports(from || null, to || null);
});

document.getElementById('btnClear').addEventListener('click', () => {
  document.getElementById('filterFrom').value = '';
  document.getElementById('filterTo').value   = '';
  loadReports(null, null);
});

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });

function printReport() { window.print(); }

function exportReportPDF() {
  const { jsPDF } = window.jspdf;
  const { meds, summary, topMeds, monthly, recentTxns, fromDate, toDate } = _reportSnapshot;

  const doc   = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const M     = 40;
  const MAROON = [123, 29, 30];
  const YELLOW = [246, 172, 2];
  const GRAY   = [141, 147, 176];
  const DARK   = [40, 40, 50];
  let y = 0;

  doc.setFillColor(...MAROON);
  doc.rect(0, 0, pageW, 54, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('MediTrack Inventory Summary Report', pageW / 2, 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 210, 160);
  doc.text('Clinic Inventory Management System', pageW / 2, 40, { align: 'center' });

  y = 70;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const rangeLabel = fromDate && toDate ? `${fromDate} — ${toDate}` : fromDate ? `From ${fromDate}` : toDate ? `Until ${toDate}` : 'All time';
  doc.text(`Date range: ${rangeLabel}`, M, y);
  doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, pageW - M, y, { align: 'right' });

  function sectionHeader(title) {
    y += 16;
    doc.setFillColor(...YELLOW);
    doc.rect(M, y, pageW - M * 2, 1.5, 'F');
    y += 13;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...MAROON);
    doc.text(title, M, y);
    y += 13;
  }

  function tableHeader(cols, widths, rowH) {
    doc.setFillColor(...MAROON);
    doc.rect(M, y, pageW - M * 2, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    let cx = M + 6;
    cols.forEach((c, i) => { doc.text(c, cx, y + 12); cx += widths[i]; });
    y += rowH;
  }

  function tableRow(cells, widths, rowH, idx) {
    if (y + rowH > 800) { doc.addPage(); y = 40; }
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 252);
    doc.rect(M, y, pageW - M * 2, rowH, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    let cx = M + 6;
    cells.forEach((cell, i) => { doc.text(String(cell).substring(0, 32), cx, y + 12); cx += widths[i]; });
    y += rowH;
  }

  function emptyRow(msg) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(msg, M + 6, y + 10);
    y += 20;
  }

  // Summary cards
  sectionHeader('Summary');
  const summaryItems = [
    ['Total Medicines',  summary.totalMedicines   ?? 0],
    ['Total Stock In',   summary.totalStockIn     ?? 0],
    ['Total Stock Out',  summary.totalStockOut    ?? 0],
    ['Approved RIS',     summary.approvedRIS      ?? 0],
  ];
  const colW = (pageW - M * 2) / 4;
  summaryItems.forEach(([label, val], i) => {
    const x = M + i * colW;
    doc.setFillColor(248, 248, 252);
    doc.roundedRect(x, y, colW - 6, 46, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...MAROON);
    doc.text(String(val), x + (colW - 6) / 2, y + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(label.toUpperCase(), x + (colW - 6) / 2, y + 37, { align: 'center' });
  });
  y += 58;

  // Top dispensed medicines
  sectionHeader('Top Dispensed Medicines');
  const safeTop = Array.isArray(topMeds) ? topMeds : [];
  if (!safeTop.length) {
    emptyRow('No dispense records found.');
  } else {
    const rowH = 18;
    tableHeader(['Rank', 'Medicine Name', 'Total Dispensed'], [44, 330, 120], rowH);
    safeTop.forEach((m, idx) => tableRow([`#${idx + 1}`, m.name || '—', String(m.total_dispensed || 0)], [44, 330, 120], rowH, idx));
  }

  // Monthly activity
  sectionHeader('Monthly Activity (Last 6 Months)');
  const sortedMonthly = [...(Array.isArray(monthly) ? monthly : [])].sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  if (!sortedMonthly.length) {
    emptyRow('No monthly data available.');
  } else {
    const rowH = 18;
    tableHeader(['Month', 'Stock In', 'Stock Out'], [240, 130, 120], rowH);
    sortedMonthly.forEach((row, idx) => {
      const [yr, mo] = row.month.split('-');
      tableRow([`${MONTH_NAMES[parseInt(mo, 10) - 1]} ${yr}`, String(row.stock_in || 0), String(row.stock_out || 0)], [240, 130, 120], rowH, idx);
    });
  }

  // Recent transactions
  sectionHeader('Recent Transactions');
  const safeTxns = Array.isArray(recentTxns) ? recentTxns : [];
  if (!safeTxns.length) {
    emptyRow('No transactions found.');
  } else {
    const rowH = 18;
    tableHeader(['Medicine', 'Type', 'Qty', 'Notes', 'Date'], [170, 56, 40, 166, 90], rowH);
    safeTxns.forEach((t, idx) => {
      const dateLabel = t.created_at ? new Date(t.created_at).toLocaleDateString('en-PH') : '—';
      tableRow([(t.medicine_name || '—'), t.type === 'in' ? 'Stock In' : 'Stock Out', String(t.quantity || 0), t.notes || '—', dateLabel], [170, 56, 40, 166, 90], rowH, idx);
    });
  }

  // Medicine inventory
  sectionHeader('Medicine Inventory');
  const safeMeds = Array.isArray(meds) ? meds : [];
  if (!safeMeds.length) {
    emptyRow('No medicines found.');
  } else {
    const rowH = 18;
    tableHeader(['#', 'Medicine Name', 'Category', 'Qty', 'Expiration'], [24, 196, 130, 50, 100], rowH);
    safeMeds.forEach((m, idx) => {
      const expStr = m.expiration_date ? new Date(m.expiration_date).toLocaleDateString('en-PH') : '—';
      tableRow([String(idx + 1), m.name || '—', m.category_name || '—', String(m.quantity ?? 0), expStr], [24, 196, 130, 50, 100], rowH, idx);
    });
  }

  // Footer
  y += 18;
  if (y + 20 > 800) { doc.addPage(); y = 40; }
  doc.setFillColor(...YELLOW);
  doc.rect(M, y, pageW - M * 2, 1.5, 'F');
  y += 12;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text('This document is computer-generated by MediTrack Clinic Inventory Management System.', pageW / 2, y, { align: 'center' });

  doc.save('MediTrack_Inventory_Summary.pdf');
  showToast('Export Successful', 'MediTrack_Inventory_Summary.pdf downloaded.', 's');
}

async function exportTransactionPDF() {
  const from = document.getElementById('txnFrom').value || null;
  const to   = document.getElementById('txnTo').value   || null;

  let url = `${API}/reports/transactions-report`;
  const qs = [];
  if (from) qs.push(`from=${from}`);
  if (to)   qs.push(`to=${to}`);
  if (qs.length) url += '?' + qs.join('&');

  let txns = [];
  try {
    const r = await fetch(url);
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data)) txns = data;
    } else {
      try { const e = await r.json(); console.error('transactions-report error:', e.error); } catch (_) {}
    }
  } catch (err) {
    console.error('exportTransactionPDF fetch error:', err);
  }

  const { jsPDF } = window.jspdf;
  const doc   = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const M     = 40;
  const MAROON = [123, 29, 30];
  const YELLOW = [246, 172, 2];
  const GRAY   = [141, 147, 176];
  const DARK   = [40, 40, 50];
  let y = 0;

  doc.setFillColor(...MAROON);
  doc.rect(0, 0, pageW, 54, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('MediTrack Transaction Report', pageW / 2, 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 210, 160);
  doc.text('Clinic Inventory Management System', pageW / 2, 40, { align: 'center' });

  y = 70;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const rangeLabel = from && to ? `${from} — ${to}` : from ? `From ${from}` : to ? `Until ${to}` : 'All time';
  doc.text(`Date range: ${rangeLabel}`, M, y);
  doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, pageW - M, y, { align: 'right' });

  y += 16;
  doc.setFillColor(...YELLOW);
  doc.rect(M, y, pageW - M * 2, 1.5, 'F');
  y += 13;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...MAROON);
  doc.text('Summary', M, y);
  y += 13;

  const stockIn  = txns.filter(t => t.type === 'in').reduce((s, t)  => s + (t.quantity || 0), 0);
  const stockOut = txns.filter(t => t.type === 'out').reduce((s, t) => s + (t.quantity || 0), 0);
  const summaryItems = [
    ['Total Transactions', txns.length],
    ['Total Stock In',     stockIn],
    ['Total Stock Out',    stockOut],
  ];
  const cardW = (pageW - M * 2) / 3;
  summaryItems.forEach(([label, val], i) => {
    const x = M + i * cardW;
    doc.setFillColor(248, 248, 252);
    doc.roundedRect(x, y, cardW - 6, 46, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...MAROON);
    doc.text(String(val), x + (cardW - 6) / 2, y + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(label.toUpperCase(), x + (cardW - 6) / 2, y + 37, { align: 'center' });
  });
  y += 58;

  y += 16;
  doc.setFillColor(...YELLOW);
  doc.rect(M, y, pageW - M * 2, 1.5, 'F');
  y += 13;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...MAROON);
  doc.text('Transaction Details', M, y);
  y += 13;

  if (!txns.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text('No transactions found for the selected date range.', M + 6, y + 10);
    y += 24;
  } else {
    const cols   = ['Medicine', 'Type', 'Qty', 'Performed By', 'Notes', 'Date'];
    const widths = [148, 58, 34, 110, 116, 88];
    const rowH   = 18;

    doc.setFillColor(...MAROON);
    doc.rect(M, y, pageW - M * 2, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    let cx = M + 6;
    cols.forEach((c, i) => { doc.text(c, cx, y + 12); cx += widths[i]; });
    y += rowH;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    txns.forEach((t, idx) => {
      if (y + rowH > 800) { doc.addPage(); y = 40; }
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 252);
      doc.rect(M, y, pageW - M * 2, rowH, 'F');
      doc.setTextColor(...DARK);
      const dateLabel = t.created_at ? new Date(t.created_at).toLocaleDateString('en-PH') : '—';
      cx = M + 6;
      [
        (t.medicine_name || '—').substring(0, 20),
        t.type === 'in' ? 'Stock In' : 'Stock Out',
        String(t.quantity || 0),
        (t.performed_by  || '—').substring(0, 16),
        (t.notes         || '—').substring(0, 18),
        dateLabel
      ].forEach((cell, i) => { doc.text(cell, cx, y + 12); cx += widths[i]; });
      y += rowH;
    });
  }

  y += 18;
  if (y + 20 > 800) { doc.addPage(); y = 40; }
  doc.setFillColor(...YELLOW);
  doc.rect(M, y, pageW - M * 2, 1.5, 'F');
  y += 12;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text('This document is computer-generated by MediTrack Clinic Inventory Management System.', pageW / 2, y, { align: 'center' });

  const slug = from || to ? `${from || 'start'}_to_${to || 'end'}` : 'All';
  doc.save(`MediTrack_Transactions_${slug}.pdf`);
  showToast('Export Successful', `MediTrack_Transactions_${slug}.pdf downloaded.`, 's');
}

function showToast(title, msg, type = 's') {
  const icons = { s: 'bi-check-circle-fill', w: 'bi-exclamation-circle-fill', e: 'bi-x-circle-fill' };
  const stack = document.getElementById('toastStack');
  const el    = document.createElement('div');
  el.className = 'toast-item';
  el.innerHTML = `<div class="toast-ico ${type}"><i class="bi ${icons[type]}"></i></div><div class="toast-body"><strong>${title}</strong><p>${msg}</p></div><button class="toast-close" onclick="this.closest('.toast-item').remove()"><i class="bi bi-x"></i></button>`;
  stack.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 4000);
}
