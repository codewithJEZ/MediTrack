(function () {
  const SIDEBAR_HTML = `
<aside class="sidebar" id="sidebar" role="navigation" aria-label="Main Navigation">
  <div class="sidebar-brand">
    <div class="brand-logo-wrap" title="MediTrack">
      <img src="../../assets/logo.png" alt="MediTrack Logo"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
      <span class="brand-logo-icon" style="display:none;"><i class="bi bi-heart-pulse-fill"></i></span>
    </div>
    <div class="brand-text">
      <span class="brand-name">MediTrack</span>
      <span class="brand-tagline">Clinic Inventory</span>
    </div>
  </div>
  <nav class="sidebar-nav">
    <span class="nav-section-label">Main Menu</span>
    <ul>
      <li class="nav-item">
        <a href="../dashboard/index.html" class="nav-link" data-page="dashboard">
          <i class="bi bi-grid-fill nav-icon"></i>
          <span class="nav-label">Dashboard</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="../medicines/medicines.html" class="nav-link" data-page="medicines">
          <i class="bi bi-capsule-pill nav-icon"></i>
          <span class="nav-label">Medicines</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="../cart/cart.html" class="nav-link" data-page="cart">
          <i class="bi bi-cart3 nav-icon"></i>
          <span class="nav-label">Cart</span>
          <span class="nav-badge" id="sidebarCartBadge" style="display:none;">0</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="../transactions/transactions.html" class="nav-link" data-page="transactions">
          <i class="bi bi-arrow-left-right nav-icon"></i>
          <span class="nav-label">Transactions</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="../ris/ris.html" class="nav-link" data-page="ris">
          <i class="bi bi-file-earmark-text-fill nav-icon"></i>
          <span class="nav-label">My Requests</span>
        </a>
      </li>
    </ul>
    <span class="nav-section-label" style="margin-top:8px;">More</span>
    <ul>
      <li class="nav-item">
        <a href="../reports/reports.html" class="nav-link" data-page="reports">
          <i class="bi bi-bar-chart-line-fill nav-icon"></i>
          <span class="nav-label">Reports</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="../settings/settings.html" class="nav-link" data-page="settings">
          <i class="bi bi-gear-fill nav-icon"></i>
          <span class="nav-label">Settings</span>
        </a>
      </li>
    </ul>
  </nav>
  <div class="sidebar-footer">
    <div class="sidebar-user">
      <div class="sidebar-avatar user-avatar"></div>
      <div class="sidebar-user-info">
        <span class="user-name"></span>
        <span class="user-role"></span>
      </div>
    </div>
    <button class="btn-sidebar-logout logout-btn" type="button">
      <i class="bi bi-box-arrow-right nav-icon"></i>
      <span class="nav-label">Logout</span>
    </button>
  </div>
</aside>`;

  // Mount sidebar
  const mount = document.getElementById('sidebarMount');
  if (mount) mount.outerHTML = SIDEBAR_HTML;

  // Set active link based on current page folder name
  const folder = window.location.pathname.replace(/\\/g, '/').split('/').filter(Boolean).slice(-2, -1)[0] || '';
  document.querySelectorAll('.sidebar .nav-link[data-page]').forEach(function (link) {
    if (link.dataset.page === folder) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // Cart badge
  var cart  = JSON.parse(localStorage.getItem('requestCart') || '[]');
  var badge = document.getElementById('sidebarCartBadge');
  if (badge && cart.length > 0) {
    badge.textContent   = cart.length;
    badge.style.display = 'inline-flex';
  }

  // Toggle (hamburger + overlay click + Escape key)
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');

  document.getElementById('menuToggle').addEventListener('click', function () {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  });

  if (overlay) {
    overlay.addEventListener('click', function () {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('show');
    }
  });
})();
