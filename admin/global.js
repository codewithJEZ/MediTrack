function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (_) { return null; }
}

function setElementValue(el, value) {
  if ('value' in el) { el.value = value; } else { el.textContent = value; }
}

function loadUserInfo() {
  const user     = getStoredUser();
  const username = user ? (user.name || user.username || 'User') : 'User';
  const role     = user ? (user.role === 'admin' ? 'Administrator' : 'Clinic Staff') : 'User';
  const avatar   = username.charAt(0).toUpperCase();
  document.querySelectorAll('.user-name').forEach(el   => setElementValue(el, username));
  document.querySelectorAll('.user-role').forEach(el   => setElementValue(el, role));
  document.querySelectorAll('.user-avatar').forEach(el => { el.textContent = avatar; });
}

function setupLogout() {
  const logoutBtn = document.querySelector('.logout-btn');
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = '../../index.html';
  });
}

window.getStoredUser = getStoredUser;
window.loadUserInfo  = loadUserInfo;

document.addEventListener('DOMContentLoaded', () => {
  setupLogout();
  loadUserInfo();
});
