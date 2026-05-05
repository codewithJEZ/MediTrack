/**
 * Campus Locator System — Admin Login
 * Connected to backend at http://localhost:3000
 */

/* ── Password visibility toggle ───────────────────────────── */
const pwInput  = document.getElementById('password');
const pwToggle = document.getElementById('pwToggle');
const eyeIcon  = document.getElementById('eyeIcon');

pwToggle.addEventListener('click', () => {
  const isHidden = pwInput.type === 'password';
  pwInput.type   = isHidden ? 'text' : 'password';
  eyeIcon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
  pwToggle.setAttribute('aria-pressed', String(isHidden));
});

/* ── Show / hide error message ─────────────────────────────── */
function showError(message) {
  const box = document.getElementById('errorBox');
  const msg = document.getElementById('errorMsg');
  msg.textContent = message;
  box.classList.add('visible');

  // Re-trigger shake animation by removing and re-adding the class
  box.style.animation = 'none';
  void box.offsetWidth;           // force reflow
  box.style.animation = '';
}

function clearError() {
  const box = document.getElementById('errorBox');
  box.classList.remove('visible');
}

/* ── Field border highlight on error ───────────────────────── */
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

/* ── Reset field styles on typing ─────────────────────────── */
document.getElementById('username').addEventListener('input', () => {
  markField('fieldUsername', false);
  clearError();
});
document.getElementById('password').addEventListener('input', () => {
  markField('fieldPassword', false);
  clearError();
});

/* ── Main login handler ────────────────────────────────────── */
async function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  // Reset previous error states
  clearError();
  markField('fieldUsername', false);
  markField('fieldPassword', false);

  // Validation
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

  if (password.length < 4) {
    showError('Password must be at least 4 characters.');
    markField('fieldPassword', true);
    return;
  }

  const btn      = document.getElementById('loginBtn');
  const btnText  = btn.querySelector('.btn-text');
  const btnArrow = btn.querySelector('.btn-arrow');

  // Button loading state
  btnText.textContent    = 'Validating…';
  btnArrow.style.display = 'none';
  btn.disabled           = true;

  await new Promise(resolve => setTimeout(resolve, 800));

  // ── CHANGED: /api/admin/login  →  /admin/login ─────────────
  try {
    const res  = await fetch('http://localhost:3000/admin/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('admin', username);
      window.location.href = '../Admin_Dashboard/index.html';
    } else {
      showError(data.message);
      btnText.textContent    = 'Login';
      btnArrow.style.display = '';
      btn.disabled           = false;
    }

  } catch {
    showError('Cannot connect to server. Make sure backend is running.');
    btnText.textContent    = 'Login';
    btnArrow.style.display = '';
    btn.disabled           = false;
  }
}

/* ── Allow Enter key to submit ─────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});
