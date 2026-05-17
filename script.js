const API = 'http://localhost:3000/api';

const pwInput  = document.getElementById('password');
const pwToggle = document.getElementById('pwToggle');
const eyeIcon  = document.getElementById('eyeIcon');

pwToggle.addEventListener('click', () => {
  const isHidden = pwInput.type === 'password';
  pwInput.type   = isHidden ? 'text' : 'password';
  eyeIcon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
  pwToggle.setAttribute('aria-pressed', String(isHidden));
});

function showError(message) {
  const box = document.getElementById('errorBox');
  const msg = document.getElementById('errorMsg');
  msg.textContent = message;
  box.classList.add('visible');
  box.style.animation = 'none';
  void box.offsetWidth;
  box.style.animation = '';
}

function clearError() {
  const box = document.getElementById('errorBox');
  box.classList.remove('visible');
}

function markField(fieldId, isError) {
  const group = document.getElementById(fieldId);
  const input = group.querySelector('.field-input');
  if (isError) {
    input.style.borderColor = '#c0392b';
    input.style.boxShadow   = '0 0 0 4px rgba(192,57,43,.12)';
  } else {
    input.style.borderColor = '';
    input.style.boxShadow   = '';
  }
}

document.getElementById('username').addEventListener('input', () => {
  markField('fieldUsername', false);
  clearError();
});
document.getElementById('password').addEventListener('input', () => {
  markField('fieldPassword', false);
  clearError();
});

async function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  clearError();
  markField('fieldUsername', false);
  markField('fieldPassword', false);

  if (!username && !password) {
    showError('Please enter your username and password.');
    markField('fieldUsername', true);
    markField('fieldPassword', true);
    return;
  }

  if (!username) {
    showError('Username is required.');
    markField('fieldUsername', true);
    return;
  }

  if (!password) {
    showError('Password is required.');
    markField('fieldPassword', true);
    return;
  }

  const btn      = document.getElementById('loginBtn');
  const btnText  = btn.querySelector('.btn-text');
  const btnArrow = btn.querySelector('.btn-arrow');

  btnText.textContent    = 'Logging in...';
  btnArrow.style.display = 'none';
  btn.disabled           = true;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Login failed');
      markField('fieldUsername', true);
      markField('fieldPassword', true);
      btnText.textContent    = 'Login';
      btnArrow.style.display = '';
      btn.disabled           = false;
      return;
    }

    localStorage.setItem('user', JSON.stringify(data));

    if (data.role === 'admin') {
      window.location.href = 'admin/dashboard/index.html';
    } else {
      window.location.href = 'staff/dashboard/index.html';
    }
  } catch {
    showError('Unable to connect to server.');
    btnText.textContent    = 'Login';
    btnArrow.style.display = '';
    btn.disabled           = false;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});
