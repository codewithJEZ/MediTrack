const API = 'http://localhost:3000/api';
const user = JSON.parse(localStorage.getItem('user'));

async function loadSettings() {
  const res = await fetch(`${API}/settings?user_id=${user.id}`);
  const data = await res.json();

  data.forEach(s => {
    const el = document.getElementById(s.key);
    if (el) el.checked = s.value === 'true';
  });
}

async function saveSetting(key, value) {
  await fetch(`${API}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user.id, key, value })
  });
}

document.querySelectorAll('input[type=checkbox]').forEach(cb => {
  cb.addEventListener('change', () => {
    saveSetting(cb.id, cb.checked);
  });
});

loadSettings();
