const API = 'http://localhost:3000/api';
const tbody = document.querySelector('#medTable tbody');

async function load() {
  const res = await fetch(`${API}/medicines`);
  const data = await res.json();

  tbody.innerHTML = '';

  data.forEach(m => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${m.name}</td>
      <td>${m.quantity}</td>
      <td><button onclick="useMed(${m.id},1)">Use</button></td>
    `;
    tbody.appendChild(row);
  });
}

load();
