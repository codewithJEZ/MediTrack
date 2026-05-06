const API = 'http://localhost:3000/api';
const tbody = document.querySelector('#txnTable tbody');

async function load() {
  const res = await fetch(`${API}/transactions`);
  const data = await res.json();

  tbody.innerHTML = data.map(t => `
    <tr>
      <td>${t.medicine_id}</td>
      <td>${t.type}</td>
      <td>${t.quantity}</td>
      <td>${t.created_at}</td>
    </tr>
  `).join('');
}

load();
