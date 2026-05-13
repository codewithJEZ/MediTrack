const API = 'http://localhost:3000/api';
let lowStock = [];

async function loadDashboard() {
  const [medsRes, txRes] = await Promise.all([
    fetch(`${API}/medicines`),
    fetch(`${API}/transactions`)
  ]);

  const medicines = await medsRes.json();
  const transactions = await txRes.json();

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  lowStock = medicines.filter(m => m.quantity < 10);
  const expiringSoon = medicines.filter(m => {
    if (!m.expiration_date) return false;
    const exp = new Date(m.expiration_date);
    return exp >= now && exp <= in30;
  });

  document.getElementById('statTotalMedicines').textContent = medicines.length;
  document.getElementById('statTotalTransactions').textContent = transactions.length;
  document.getElementById('statLowStock').textContent = lowStock.length;
  document.getElementById('statExpiringSoon').textContent = expiringSoon.length;
}

loadDashboard();

const nav = {
  btnAddMedicine:         '../medicines/medicines.html',
  btnDispense:            '../transactions/transactions.html',
  btnRestock:             '../ris/ris.html',
  btnGenerateReport:      '../reports/reports.html',
  btnViewAllTransactions: '../transactions/transactions.html',
};
Object.entries(nav).forEach(([id, href]) => {
  document.getElementById(id)?.addEventListener('click', () => { window.location.href = href; });
});

document.getElementById('btnRequestReorder')?.addEventListener('click', () => {
  const cart = JSON.parse(localStorage.getItem('requestCart') || '[]');
  lowStock.forEach(m => {
    const existing = cart.find(item => item.id === m.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: m.id, name: m.name, unit: m.unit || '', qty: 1, note: '' });
    }
  });
  console.log('[RequestReorder] cart updated:', cart);
  localStorage.setItem('requestCart', JSON.stringify(cart));
  window.location.href = '../medicines/medicines.html';
});
