const AVATAR_COLORS = ['#7B1D1E','#2563eb','#16a34a','#ea580c','#7c3aed','#0891b2'];
let USERS = [];
let editUserId = null;
let deleteUserId = null;


function getInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function getAvatarColor(id) { return AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length]; }

function renderUsers(data) {
  const tbody = document.getElementById('usersBody');
  document.getElementById('userCount').textContent = `${data.length} user${data.length !== 1 ? 's' : ''} found`;
  document.getElementById('sumAllUsers').textContent = USERS.length;
  document.getElementById('sumActiveUsers').textContent = USERS.length;
  document.getElementById('sumAdmins').textContent = USERS.filter(u => u.role === 'admin').length;

  tbody.innerHTML = data.map(u => {
    const roleLabel = u.role === 'admin' ? 'Admin' : 'Staff';
    const roleClass = u.role === 'admin' ? 'role-admin' : 'role-staff';
    const createdDt = new Date(u.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-tbl-avatar" style="background:${getAvatarColor(u.id)};">${getInitials(u.name)}</div>
            <div>
              <div class="user-tbl-name">${u.name}</div>
              <div class="user-tbl-email">${u.username}</div>
            </div>
          </div>
        </td>
        <td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
        <td class="td-date">${createdDt}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn-tbl btn-edit" onclick="openEditModal(${u.id})"><i class="bi bi-pencil"></i> Edit</button>
            <button class="btn-tbl btn-del" onclick="openDeleteModal(${u.id})"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function applyFilters() {
  const q    = document.getElementById('searchInput').value.toLowerCase();
  const role = document.getElementById('roleFilter').value;
  const data = USERS.filter(u =>
    (!q    || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)) &&
    (!role || u.role === role)
  );
  renderUsers(data);
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('roleFilter').addEventListener('change', applyFilters);

document.getElementById('btnAddUser').addEventListener('click', openAddModal);

function openAddModal() {
  document.getElementById('newUserName').value     = '';
  document.getElementById('newUserUsername').value = '';
  document.getElementById('newUserRole').value     = '';
  document.getElementById('addUserModal').classList.add('show');
}
function closeAddModal() { document.getElementById('addUserModal').classList.remove('show'); }

async function saveUser() {
  const name     = document.getElementById('newUserName').value.trim();
  const username = document.getElementById('newUserUsername').value.trim();
  const role     = document.getElementById('newUserRole').value;
  if (!name || !username || !role) { showToast('Incomplete Form', 'Please fill in all required fields.', 'e'); return; }
  const res = await fetch(`${API}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, password: 'meditrack@2026', role })
  });
  if (res.ok) {
    closeAddModal();
    showToast('User Added', `${name} has been added. Default password: meditrack@2026`, 's');
    loadUsers();
  } else {
    const err = await res.json();
    showToast('Error', err.error || 'Failed to add user.', 'e');
  }
}

function openEditModal(id) {
  const u = USERS.find(x => x.id === id);
  editUserId = id;
  document.getElementById('editUserName').value     = u.name;
  document.getElementById('editUserUsername').value = u.username;
  document.getElementById('editUserRole').value     = u.role;
  document.getElementById('editUserModal').classList.add('show');
}
function closeEditModal() {
  editUserId = null;
  document.getElementById('editUserModal').classList.remove('show');
}

async function updateUser() {
  const id = Number(editUserId);
  if (!id || isNaN(id)) { showToast('Error', 'Invalid user ID.', 'e'); return; }
  const name     = document.getElementById('editUserName').value.trim();
  const username = document.getElementById('editUserUsername').value.trim();
  const role     = document.getElementById('editUserRole').value;
  if (!name || !username || !role) { showToast('Incomplete Form', 'Please fill in all required fields.', 'e'); return; }
  const res = await fetch(`${API}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, role })
  });
  if (res.ok) {
    closeEditModal();
    showToast('User Updated', `${name} has been updated.`, 's');
    await loadUsers();
  } else {
    const err = await res.json();
    showToast('Error', err.error || 'Failed to update user.', 'e');
  }
}

function resetPassword() {
  document.getElementById('resetPasswordModal').classList.add('show');
}
function closeResetModal() {
  document.getElementById('resetPasswordModal').classList.remove('show');
}
async function doResetPassword() {
  closeResetModal();
  const res = await fetch(`${API}/users/${editUserId}/reset-password`, { method: 'POST' });
  if (res.ok) {
    showToast('Password Reset', 'Password has been reset to meditrack@2026.', 's');
  } else {
    showToast('Error', 'Failed to reset password.', 'e');
  }
}

function openDeleteModal(id) {
  deleteUserId = id;
  const u = USERS.find(x => x.id === id);
  document.getElementById('deleteUserName').textContent = u ? u.name : 'this user';
  document.getElementById('deleteUserModal').classList.add('show');
}
function closeDeleteModal() {
  deleteUserId = null;
  document.getElementById('deleteUserModal').classList.remove('show');
}

async function confirmDeleteUser() {
  if (!deleteUserId) return;
  const u = USERS.find(x => x.id === deleteUserId);
  const res = await fetch(`${API}/users/${deleteUserId}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('User Removed', `${u ? u.name : 'User'} has been removed.`, 's');
    closeDeleteModal();
    await loadUsers();
  } else {
    showToast('Error', 'Failed to delete user.', 'e');
  }
}

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });


function showToast(title, msg, type = 's') {
  const icons = { s: 'bi-check-circle-fill', w: 'bi-exclamation-circle-fill', e: 'bi-x-circle-fill' };
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.innerHTML = `<div class="toast-ico ${type}"><i class="bi ${icons[type]}"></i></div><div class="toast-body"><strong>${title}</strong><p>${msg}</p></div><button class="toast-close" onclick="this.closest('.toast-item').remove()"><i class="bi bi-x"></i></button>`;
  stack.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 4000);
}

async function loadUsers() {
  const res = await fetch(`${API}/users`, { cache: 'no-store' });
  USERS = await res.json();
  applyFilters();
}

loadUsers();
