function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function setElementValue(el, value) {
  if ('value' in el) {
    el.value = value;
  } else {
    el.textContent = value;
  }
}

function loadUserInfo(userOverride) {
  const user = userOverride || getStoredUser();
  if (!user) return;

  const username = String(user.username || user.name || 'User').trim() || 'User';
  const role = user.role || '';
  const avatarInitial = username.trim().charAt(0).toUpperCase();

  document.querySelectorAll('.user-name').forEach(el => setElementValue(el, username));
  document.querySelectorAll('.user-role').forEach(el => setElementValue(el, role));
  document.querySelectorAll('.user-avatar').forEach(el => {
    el.textContent = avatarInitial;
  });
}

function setupLogout() {
  const logoutBtn = document.querySelector('.logout-btn');
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = location.origin + '/index.html';
  });
}

window.loadUserInfo = loadUserInfo;

document.addEventListener('DOMContentLoaded', () => {
  setupLogout();
});

document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
});
