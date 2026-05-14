// js/navbar.js — Dynamic navbar based on auth state

import { isLoggedIn, getUserRole, removeToken, getCurrentUser } from './session.js';

export function renderNavbar() {
  const nav = document.getElementById('nav-links');
  if (!nav) return;

  const loggedIn = isLoggedIn();
  const role     = getUserRole();
  const user     = getCurrentUser();

  let html = `
    <li class="nav-item">
      <a class="nav-link" href="#/" id="nav-home-link"><i class="bi bi-house me-1"></i>Home</a>
    </li>`;

  if (!loggedIn) {
    html += `
      <li class="nav-item">
        <a class="nav-link" href="#/login" id="nav-login-link"><i class="bi bi-box-arrow-in-right me-1"></i>Login</a>
      </li>
      <li class="nav-item">
        <a class="btn btn-primary-custom ms-1" href="#/register" id="nav-register-link">
          <i class="bi bi-person-plus me-1"></i>Register
        </a>
      </li>`;
  } else {
    // Author/Admin: New Post
    if (role === 'author' || role === 'admin') {
      html += `
        <li class="nav-item">
          <a class="nav-link" href="#/posts/new" id="nav-new-post-link">
            <i class="bi bi-plus-lg me-1"></i>New Post
          </a>
        </li>`;
    }
    // Admin links
    if (role === 'admin') {
      html += `
        <li class="nav-item">
          <a class="nav-link" href="#/admin" id="nav-admin-link">
            <i class="bi bi-shield-lock me-1"></i>Admin
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#/dashboard" id="nav-dashboard-link">
            <i class="bi bi-speedometer2 me-1"></i>Dashboard
          </a>
        </li>`;
    }

    // User dropdown
    const badgeClass = role === 'admin' ? 'admin' : role === 'author' ? 'author' : 'reader';
    html += `
      <li class="nav-item dropdown ms-1">
        <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#" id="userDropdown"
           role="button" data-bs-toggle="dropdown" aria-expanded="false">
          <div class="avatar-circle" style="width:28px;height:28px;font-size:0.65rem;">
            ${(user?.id ? String(user.id) : '?').slice(0, 1)}
          </div>
          <span class="role-badge ${badgeClass}">${role || 'user'}</span>
        </a>
        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
          <li><span class="dropdown-item-text text-muted-custom small px-3 py-1">Signed in as <strong>${role}</strong></span></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" id="nav-logout-btn">
            <i class="bi bi-box-arrow-right me-2"></i>Logout
          </a></li>
        </ul>
      </li>`;
  }

  nav.innerHTML = html;

  // Logout handler
  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      removeToken();
      window.location.hash = '#/';
      // Re-render navbar
      renderNavbar();
    });
  }
}
