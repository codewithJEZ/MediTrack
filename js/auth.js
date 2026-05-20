function checkAuth(role, redirectPath) {
  try {
    var stored = localStorage.getItem('user');
    if (!stored) { window.location.replace(redirectPath); return; }
    var user = JSON.parse(stored);
    if (!user || user.role !== role) { window.location.replace(redirectPath); }
  } catch (e) {}
}
