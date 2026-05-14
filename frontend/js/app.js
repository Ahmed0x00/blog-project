// js/app.js — Main entry point: router, navbar, page dispatch

import { renderNavbar }          from './navbar.js';
import { isLoggedIn, getUserRole } from './session.js';
import { showToast }              from './toast.js';

// Page renderers
import { renderHomePage }       from './pages/homePage.js';
import { renderLoginPage }      from './pages/loginPage.js';
import { renderRegisterPage }   from './pages/registerPage.js';
import { renderPostDetailPage } from './pages/postDetailPage.js';
import { renderCreatePostPage } from './pages/createPostPage.js';
import { renderEditPostPage }   from './pages/editPostPage.js';
import { renderAdminPage }      from './pages/adminPage.js';
import { renderDashboardPage }  from './pages/dashboardPage.js';

// ── Initial render ──────────────────────────────────────────────
renderNavbar();
route();

// Listen for hash changes (SPA navigation)
window.addEventListener('hashchange', () => {
  route();
  renderNavbar(); // Re-render navbar on navigation (auth state may change)
});

// ── Router ──────────────────────────────────────────────────────
async function route() {
  const hash = window.location.hash || '#/';
  const content = document.getElementById('page-content');
  if (!content) return;

  // Scroll to top on navigation
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update document title
  document.title = 'BlogSphere — Blog Management System';

  // ── Route matching ──────────────────────────────────────────
  // Home
  if (hash === '#/' || hash === '') {
    return renderHomePage(content);
  }

  // Login (redirect if already logged in)
  if (hash === '#/login') {
    if (isLoggedIn()) { window.location.hash = '#/'; return; }
    document.title = 'Sign In — BlogSphere';
    return renderLoginPage(content);
  }

  // Register (redirect if already logged in)
  if (hash === '#/register') {
    if (isLoggedIn()) { window.location.hash = '#/'; return; }
    document.title = 'Create Account — BlogSphere';
    return renderRegisterPage(content);
  }

  // Create post (Author / Admin only)
  if (hash === '#/posts/new') {
    if (!guardAuth()) return;
    if (!guardRole(['author', 'admin'], 'Only authors and admins can create posts.')) return;
    document.title = 'New Post — BlogSphere';
    return renderCreatePostPage(content);
  }

  // Edit post — #/posts/:id/edit
  const editMatch = hash.match(/^#\/posts\/(\d+)\/edit$/);
  if (editMatch) {
    if (!guardAuth()) return;
    document.title = 'Edit Post — BlogSphere';
    return renderEditPostPage(content, parseInt(editMatch[1]));
  }

  // Post detail — #/posts/:id
  const postMatch = hash.match(/^#\/posts\/(\d+)$/);
  if (postMatch) {
    document.title = 'Post — BlogSphere';
    return renderPostDetailPage(content, parseInt(postMatch[1]));
  }

  // Admin panel (Admin only)
  if (hash === '#/admin') {
    if (!guardAuth()) return;
    if (!guardRole(['admin'], 'Admin access only.')) return;
    document.title = 'Admin Panel — BlogSphere';
    return renderAdminPage(content);
  }

  // Dashboard (Admin only)
  if (hash === '#/dashboard') {
    if (!guardAuth()) return;
    if (!guardRole(['admin'], 'Admin access only.')) return;
    document.title = 'Dashboard — BlogSphere';
    return renderDashboardPage(content);
  }

  // 404 fallback
  render404(content);
}

// ── Route Guards ────────────────────────────────────────────────
function guardAuth() {
  if (!isLoggedIn()) {
    showToast('Please log in to continue.', 'info');
    window.location.hash = '#/login';
    return false;
  }
  return true;
}

function guardRole(allowedRoles, message = 'Access denied.') {
  const role = getUserRole();
  if (!role || !allowedRoles.includes(role)) {
    showToast(message, 'error');
    window.location.hash = '#/';
    return false;
  }
  return true;
}

function render404(container) {
  document.title = '404 — BlogSphere';
  container.innerHTML = `
    <div class="empty-state" style="min-height:50vh;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div style="font-size:6rem;font-weight:900;background:linear-gradient(135deg,var(--accent-from),var(--accent-to));
                  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;">
        404
      </div>
      <h2 class="mt-2 fs-3 fw-bold">Page Not Found</h2>
      <p class="text-muted-custom">The page you're looking for doesn't exist.</p>
      <a href="#/" class="btn btn-primary-custom mt-3" id="go-home-404">
        <i class="bi bi-house me-1"></i>Go Home
      </a>
    </div>`;
}
