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

// ── RIS pending badge ──────────────────────────────────────────

function initRisBadge() {
  if (document.getElementById('risPendingBadge')) return;
  let risLink = null;
  document.querySelectorAll('.sidebar a[href*="ris/ris.html"]').forEach(link => {
    const label = link.querySelector('.nav-label');
    if (label && label.textContent.trim() === 'RIS Requests') risLink = link;
  });
  if (!risLink) return;
  const badge = document.createElement('span');
  badge.className    = 'nav-badge';
  badge.id           = 'risPendingBadge';
  badge.style.display = 'none';
  badge.textContent  = '0';
  risLink.appendChild(badge);
}

function setRisBadgeCount(count) {
  const badge = document.getElementById('risPendingBadge');
  if (!badge) return;
  badge.textContent   = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

function updateRisBadge() {
  fetch(`${API}/ris`)
    .then(r => r.json())
    .then(data => {
      const count = Array.isArray(data) ? data.filter(r => r.status === 'pending').length : 0;
      setRisBadgeCount(count);
    })
    .catch(() => {});
}

window.getStoredUser    = getStoredUser;
window.loadUserInfo     = loadUserInfo;
window.setRisBadgeCount = setRisBadgeCount;
window.updateRisBadge   = updateRisBadge;

document.addEventListener('DOMContentLoaded', () => {
  setupLogout();
  loadUserInfo();
  initRisBadge();
  if (document.getElementById('risPendingBadge')) {
    updateRisBadge();
    if (!window._risBadgeInterval) {
      window._risBadgeInterval = setInterval(updateRisBadge, 10000);
    }
  }
});
