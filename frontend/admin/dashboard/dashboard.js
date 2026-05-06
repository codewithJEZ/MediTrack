const API = 'http://localhost:3000/api';

async function loadDashboard() {
  const meds = await fetch(`${API}/medicines`).then(r=>r.json());
  const txns = await fetch(`${API}/transactions`).then(r=>r.json());

  document.getElementById('totalMeds').innerText = meds.length;
  document.getElementById('totalTxn').innerText = txns.length;

  const low = meds.filter(m => m.quantity <= 10);
  document.getElementById('lowStock').innerText = low.length;
}

loadDashboard();
